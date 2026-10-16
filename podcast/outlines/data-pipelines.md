# Outline: data-pipelines

Source: src/lessons/data-pipelines.mdx. Curriculum entry: "Data a model can eat." Question: how do you
turn raw text like Wikipedia into training data a model learns well from? Why: listed in research
engineer roles; data quality matters more than model tricks. Source: Anthropic research engineer posting.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

Diagnostic gaps touched: numbers (bytes, file sizes, tokens per second, CPU seconds), processes vs
threads and the GIL (tokenizing in worker processes; Rust releasing the GIL), "output distribution"
fuzzy (a model learns the distribution of its training data), and virtual memory (memmap).

## Today / prerequisites

- T1 Prereqs: processes/threads/GIL (CPU-bound Python, worker processes); tokenizers; tiny LM (two runs). -> Re-explained inline where each is used: tiny LM in the opening scene, GIL at tokenizing, memmap at the file format. "Today" list skipped.
- T2 Rough time: one evening pipeline, one evening training runs. -> A, one line at Build It.

## The Problem

- P1 Tiny LM trained on Wikipedia samples "The city is in the north of the country" then cite-web template, category tag. -> A opens on this scene, describes the junk in words (curly braces, "cite web", category tag), no symbols.
- P2 Term wikitext: Wikipedia's markup language: double square brackets = links, double curly braces = templates, HTML-like tags = references and tables. -> A, inline.
- P3 Model learned exactly what you showed it: the source code; token budget spent teaching a thirty-million-parameter model to close curly braces. -> A, punchline.
- P4 Strip markup, retrain: suspiciously fluent word-for-word sentences about French villages; thousands of near-identical stubs (Omiécourt example); model memorised the template. -> A, continuing; B voices "isn't that just the model being good?" A: memorised.
- P5 Validation loss looks great partly because held-out articles share whole paragraphs with training articles. -> A, third problem.
- P6 None is a modelling problem; fancier architecture keeps all of them. Posting: "making Wikipedia data fit in a format a model can easily consume"; training "is about understanding the data". -> B's wrong model: "so a bigger model would smooth it over?" A: no. A quotes the posting plainly.

## Origin

- O1 GPT-2 (2019) WebText: pages linked from Reddit posts with at least three karma; crude but effective filter (a human found it worth sharing). -> A story.
- O2 T5 (Raffel et al., released 2019, published 2020) published cleaning rules. C4, Colossal Clean Crawled Corpus: one month of Common Crawl; keep lines ending in punctuation; drop pages under five sentences; drop "lorem ipsum" or curly brace pages; bad-words list; dedup repeated three-sentence spans; cleaned beat unfiltered. -> A.
- O3 The Pile (EleutherAI, 2020): 825 GiB from 22 hand-picked sources (PubMed, arXiv, GitHub, books, Wikipedia); diverse curated beats raw web. -> A.
- O4 Gopher (DeepMind, 2021): simple quality rules everyone copies. -> A.
- O5 RefinedWeb (2023, Falcon): web alone, filtered and deduped hard, matches curated mixtures. -> A.
- O6 FineWeb (Penedo et al., 2024, Hugging Face): fifteen trillion tokens plus the ablations behind every decision; FineWeb-Edu small classifier for "educational value" beat much larger datasets on knowledge benchmarks. -> A.
- O7 Arc: architectures converged, datasets became what separates good from bad models. -> A, one line; B reacts.

## The Idea

### Garbage in, confidently out
- I1 LM learns to predict next token of whatever you feed it; learns the distribution of training data, not "English" or "facts". -> A; plain-word definition of "distribution" (how often each continuation follows each context in your data). Diagnostic gap.
- I2 Quirks it spends capacity on: markup it never needs; boilerplate (cookie banners, nav menus, "This article is a stub..." banner) it'll reproduce; duplicates as hidden learning-rate multiplier (1,000 copies = 1,000 times the gradient, memorise not generalise); leaked test questions make evals lie. -> A, B's wrong model: "duplicates are just wasted disk". A corrects: they're upweighting.
- I3 Three reasons data is the lever: capacity finite (curly braces vs grammar); tokens are the budget (fixed compute = fixed tokens, cleaning makes each teach more); effects large (FineWeb ablations: swapping data moves scores as much as a big jump in model size). -> A.

### Pipeline shape
- F1 Figure 001 assembly line: three tiers. What counts as text: acquire, extract, normalize. What to keep: language ID, quality, dedup, PII, decontam. How to store it: tokenize, pack, shard + shuffle, trainer reads uint16 rows. Every stage changes documents, throws documents away, or changes format. Order: cheap filters first so expensive ones see fewer docs. Documents in, token shards out. -> A, described as three rows over the phone.
- I4 Real input: Simple English Wikipedia: same format as full English, about twenty times smaller; minutes on a laptop vs hours. -> A.

### Acquisition
- I5 dumps.wikimedia.org (said as "Wikimedia's dump site"), about twice a month; file simplewiki latest pages articles, XML, bzip2. Oct 2026: 358 MB compressed, 1.71 GB XML; 562,214 pages; 285,478 real articles; 115,214 redirects; rest templates, categories, help pages. -> A, numbers with comparisons.
- I6 Term redirect: page that only says "go to X" (USA -> United States). Term namespace: sorting pages by kind; namespace zero is articles; each page has an ns field. -> A inline.
- I7 Each page: title, ns, id, revision, text holding the wikitext (Paris example with infobox, bold, links, ref, category). -> A describes the shape of one page record, no XML read.
- I8 One giant XML document: stream it, one page at a time, throw away; iterparse plus clear after each page or memory grows. -> A, "iterparse" said as a name; B: "why not just load it?" answered by 1.7 GB.
- I9 Term bzip2: squeezes text well, decompresses slowly, a few tens of MB per second per core. On M4 Pro: decompress alone 77 CPU-seconds; streaming pass with XML parse about 100 seconds one core; the floor before real work. -> A.
- I10 Shortcut: Hugging Face wikimedia/wikipedia dataset, pre-extracted text as Parquet, one config per language and dump date (e.g. 20231101.simple; check dataset card). Term Parquet: column-oriented, values of one column stored together and compressed, fast to read one column; standard for tables at rest. Do it from XML at least once: extraction holds most decisions and time. -> A.

### Extraction
- I11 Wikitext is a programming language that happens to contain prose. -> A.
- F2 Figure 002 wikitext anatomy: Seine example. Infobox template, bold title, link "river", piped link "France|northern France", ref with cite web, "flows through Paris", wikitable with Length 777 km, File Seine.jpg thumb, Category Rivers of France. Output: "The Seine is a river in northern France. It flows through Paris." Solid = keep visible text, dashed = drop whole thing. Nesting is the hard part. -> A describes it as before/after.
- I12 Templates (Term: wikitext functions in double curly braces expanding into boxes, citations, dates; infoboxes, citations, nav boxes): almost all dropped; a few (date, unit, convert 777 km) produce visible text, lose a little: deliberate trade. -> A; B asks "don't you lose the 777 km?" A: yes, deliberate.
- I13 Links keep shown text; references dropped; tables dropped (flattened = mess of numbers and pipes); files and categories dropped; bold/italics/headings keep text (== History == -> History). -> A, quick list as speech.
- I14 Regexes break on nesting (ref inside template inside table). mwparserfromhell parses into tree you walk and edit; wikiextractor classic command-line tool. Real wikitext still surprises; fix by looking at samples, the actual skill. -> A.
- I15 Big number: GPT-2 tokenizer, raw wikitext of all 285,478 articles = 373 million tokens; extracted text = 69 million. Over 80% of tokens are markup. Markup tokenizes badly: about 2.8 characters/token vs 4.3 for prose. Extraction most expensive stage (full parse tree per article in Python). -> A; B guesses "maybe a third is markup?" -> wrong, over eighty percent.

### Normalization
- I16 Same visible string, different bytes: café as four code points or five (e plus combining acute accent). Look identical, compare unequal, hash differently, tokenize differently. -> A.
- I17 Term Unicode normalization: rewrite to one canonical byte form; NFC composes, NFD decomposes. Use NFC (Normalization Form C, canonical composition; what most web text uses; safe default; unicodedata.normalize). NFKC also folds look-alikes (fi ligature to f i, full-width digits); more aggressive, changes meaning occasionally; C4-style usually NFC. -> A, letters spelled out.
- I18 Whitespace: collapse spaces and tabs, non-breaking to normal, strip lines, three-plus newlines to two; keep single and double newlines, paragraph breaks are structure. -> A.
- I19 Matters most for dedup: compares hashes, stray non-breaking space makes identical docs differ. -> A.

### Language ID
- I20 Term language identification: tiny fast classifier on character n-grams returning label and confidence. First filter in nearly every web pipeline. fastText lid.176 (Facebook 2017): 176 languages, under 1 MB compressed, fast on billions. FineWeb keeps English at probability at least 0.65; C4 a different detector at 0.99. -> A.
- I21 On Simple English Wikipedia removed 4,084 articles (1.4%), most actually English. "Lys, Pyrénées-Atlantiques is a commune..." scored 0.0 English: short sentence, half French place names. Unreliable on short name-heavy text. On web acceptable; curated English corpus lower threshold or skip short docs. Measure before trusting. -> A; B "zero, not even low?" A: zero.

### Quality rules
- I22 What is "good" text? No definition; proxies; simple rules first; Gopher rules everyone copies. -> A.
- I23 Gopher table: length 50 to 100,000 words (stubs, error pages, giant dumps); mean word length 3 to 10 characters (number lists, base64 blobs, URL soup); symbols fewer than 1 hash or ellipsis per 10 words (hashtag spam, truncated previews); under 90% lines start with bullet, under 30% end in ellipsis (menus, listicles, teasers); at least 80% of words contain a letter (number tables, code, coordinates); at least 2 of the eight stop words (text that isn't sentences); repetition: not too many duplicate lines, paragraphs, repeated n-grams (spam, templated pages, "click here" fifty times). -> A, told as "each rule and what it catches" in speech, not a table read; B reacts to base64/URL soup example.
- I24 C4 rules: lines end in terminal punctuation; lines at least three words; pages at least five sentences; drop lines mentioning JavaScript ("please enable JavaScript"); drop pages with lorem ipsum or curly brace (why C4 has almost no code). Every rule throws out some good text; find out by training. -> A; B notices curly brace rule kills code.
- I25 Term stop words: commonest little words (the, of, and, to); real sentences full of them, lists/tables/keyword spam aren't; absence a strong junk signal; looks silly, works. -> A.
- I26 Length on Wikipedia: huge number of one-two sentence stubs, not wrong, teach little, many templated; 50-word minimum removes large share of docs, small share of tokens. -> A, sets up asymmetry.

### Model as judge
- I27 Rules can't tell mediocre forum post from great textbook paragraph. Term quality classifier: cheap model reading a doc and outputting a score, trained on good/bad labels by humans, reference corpus, or bigger LLM. -> A.
- I28 GPT-3 (2020): classifier to tell Common Crawl from known-good reference (WebText, books, Wikipedia), keep pages that look like reference. -> A.
- I29 FineWeb-Edu: Llama-3-70B-Instruct rated about 450,000 pages 0 to 5 for educational value for primary to grade school; small regression head on sentence-embedding model predicts ratings; ran on all fifteen trillion tokens; keep 3+ left about 1.3 trillion; better on MMLU and ARC. -> A; B's wrong model: "so they ran the seventy-billion model on everything?" A: no, it labelled a sample, small model does the rest.
- I30 Cautions: inherit the judge's taste (school knowledge, not obviously conversation or code); classifier can't be what you evaluate with (grading your own homework). On Wikipedia matters less; build uses rules only, classifier as extension. -> A.

### Exact dedup
- I31 Hash each normalized doc (SHA-1 or fast, wide enough), keep first per hash; one pass, set of 20-byte hashes; ten million docs = 200 MB set; fine on one machine. -> A, numbers with sizes (gap: bytes).
- I32 Catches mirror copies, reposts; on web a lot; on Wikipedia 186 articles (Amenia town vs CDP, New York; three Japanese footballers identical once infoboxes stripped). Real problem: docs 95% the same. -> A.

### Near dedup: MinHash
- I33 Scene: thousands of articles from one template (French communes, Italian municipalities, asteroids, US counties), differ by a name and a number; hashing misses; to model the same lesson thousands of times. -> A.
- I34 Term shingles: overlapping runs of k consecutive words ("the cat sat on" with k three gives two). Term Jaccard similarity: overlap divided by union; 1 identical, 0 nothing. Template stubs share most shingles; unrelated share almost none. -> A with spoken example; B asks for actual meaning of union.
- I35 Scale problem: 285,000 docs = about 40 billion pairs; hopeless; 100-million-doc web absurd. -> A; B "just throw GPUs at it?" no.
- I36 The trick: shuffle every possible shingle into one random order; each doc's first shingle = its min; chance two docs share min: first shingle of union equally likely any; if shared, match; so probability of same min = shared over all = Jaccard. One shuffle = coin landing match with probability equal to similarity. -> A, slow, worked example with small numbers. B voices wrong model (it'd be random/meaningless) and then gets it.
- I37 Flip with 128 shuffles; fraction of matches estimates Jaccard; error about square root of J times one-minus-J over k (said in words). Real shuffle impossible: seeded hash, take smallest value; different seed = different shuffle. Term MinHash signature: short fixed list (128) summarising shingle set; fraction of agreeing positions estimates Jaccard. -> A.
- F3 Figure 003 interactive: presets (template stubs Omiécourt/Hyencourt-le-Grand, one edit, unrelated), 3-word shingles colored in both/in one, true Jaccard vs estimate, typical error, one cell per hash function filled when both pick the same shingle, k slider 1 to 256, "new random hashes"; small k jumps, k 128 within about 0.05. -> A describes what you'd see dragging k down to four and reseeding.
- PR1 Predict: J 0.54, k 16 vs k 128 error. Answer: average of k coin flips, standard deviation formula; k 16 about plus or minus 0.12, k 128 about 0.044. Checked with datasketch over 100 seeds: 0.129 (16), 0.062 (64), 0.044 (128), 0.029 (256). Eight times hashes = square root of eight about 2.8 times precision; why people stop at 100-250. -> A asks, B guesses (linearly eight times better, wrong), reveal with worked numbers.

### LSH
- I38 Signatures make each comparison cheap (128 numbers vs thousands of shingles) but still 40 billion pairs. Term LSH: hashing so similar items likely share a bucket; only compare same-bucket items. -> A; B: "still forty billion" sets it up naturally.
- I39 Cut into b bands of r rows (9 bands of 13). Hash each band to a bucket. Term candidate pair: collide in any band; only candidates compared. -> A.
- I40 Why: one band matches if all r rows match: s to the r. Escape only if every band fails. Candidate probability = one minus (one minus s to the r) to the b. S-curve with step near one-over-b to the one-over-r. Choosing b and r chooses step. -> A in words with a worked example (my derived: 0.9 to the 13 is about a quarter; 0.5 to the 13 tiny). Flag derived numbers.
- F4 Figure 004 interactive S-curve: x Jaccard 0 to 1, y probability candidate; sliders bands (1-40) and rows (1-25); buttons datasketch 0.8 (9 by 13), FineWeb (14 by 8), loose (20 by 5); more rows push step right (stricter), more bands pull left and sharpen; dashed ideal step. -> A describes dragging.
- I41 datasketch MinHashLSH threshold 0.8, 128 perms: 9 bands by 13 rows; 0.9-similar caught 93%, 0.8-similar only 40% (threshold balances false positives vs negatives). FineWeb: 112 hashes, 14 bands of 8, 5-word shingles: 0.75-similar caught about 77%. Each bucket lookup a dictionary access; roughly linear in docs. -> A; B surprised 40% at the threshold.
- I42 Candidates: trust or verify (signatures or real shingles), group into clusters with union-find (Term: merges items into groups as you discover pairs, tells any item's group fast), keep one per cluster. -> A.
- PR2 Predict: fraction of Simple Wikipedia flagged (Jaccard at least 0.8, 5-word shingles): 0.1, 1, 10%? Answer: alone 13,468 docs, 4.7%, 1,355 clusters holding 14,823 articles; biggest bot stubs: 688, 518, 447 French communes in three departments; Gagyapáti/Litka Hungary village "In 2024, 33 people lived there". Humans curate, bots and templates write. Twist: with length filter first, only 56 more removed; filters overlap, order decides credit; on web crawls dedup removes far more because long pages get copied. -> A asks, B guesses 0.1% (Wikipedia is curated); reveal.
- I43 FineWeb finding: expected dedup across all 96 Common Crawl snapshots best; per-snapshot better; global removed good content that appears in many crawls because it's good; survivors skewed junk. Dedup a tool, not a virtue; measure. -> A; B's wrong model: "more dedup is always better".

### PII
- I44 Term PII: emails, phone numbers, street addresses, ID numbers; models memorise and repeat. Baseline: regexes for emails, phones, IP addresses, replace with placeholder (EMAIL tag or dummy), don't delete doc. Bigger pipelines add named-entity models. -> A.
- I45 Two naive regexes (email; 10+ digits with separators phone) fired 66,207 times in 5,000 articles; almost none phones: populations, sports stats, date ranges, ISBNs. Loose phone regex eats every long number. Look at matches first. -> A; B reacts with numbers (about thirteen per article, derived).

### Decontamination
- I46 Eval text in training = measures memorisation. Term contamination. Easy on Wikipedia: benchmarks built from it (SQuAD, Natural Questions, TriviaQA contexts), articles quote each other. -> A.
- I47 Term n-gram overlap: shared run of n words, n 8 to 13 unlikely coincidence. Collect every 13-word sequence in eval into a hash set; drop training docs with any (or the overlapping region). GPT-3 used 13; others 8 to 50. Shorter catches more but flags common phrases ("in the United States of America" is seven words). -> A.
- I48 Build: hold out 1% as clean eval, decontam the rest. B's wrong model: "pointless, they're different articles". Result: 4,765 training articles (of about 172,000 surviving) shared a 13-gram with the 1,748 eval articles. -> B voices it, A reveals.
- I49 Split: template sentences ("the united states census bureau says that the city has a total area of" in 264; "is a former japanese football player he played for the japan national team" 232; "scientists from the iucn say this frog is not in danger of dying out" 184): not fact leakage but inflates eval. Real copying: Ring (mathematics) shared 253 of its 660 13-grams with Field (mathematics); NHL season articles shared over half with one held-out season: the leak behind the too-good validation loss. -> A, quotes said as speech.
- I50 Single shared 13-gram is blunt; real pipelines remove only overlapping spans or flag by fraction; dropping everything costs 3.6% of tokens. -> A.
- F5 Figure 005 funnel: toggles per filter, every combination computed from real output; tokens vs documents switch. Length removes many docs few tokens; near-dedup few docs but repetitive; extraction alone removes more than half the tokens. -> A describes "what if I didn't dedup" toggling.

### Tokenizing
- I51 Embarrassingly parallel; CPU-bound, no shared state, one worker process per shard (GIL recap: one Python thread runs at a time per process, so threads don't help pure Python; processes each have their own interpreter). Rust core (HF tokenizers, tiktoken) releases GIL inside batch calls, so threads work too. -> B's wrong model: "threads, then"; A recaps GIL in two sentences.
- I52 Measured tiktoken GPT-2: about 2.3M tokens/s one thread, about 10M/s with batch and eight threads; all 69M clean tokens 8.3 s with ten threads. Not where time goes. -> A, numbers with comparisons.
- I53 Send paths, not data: pickling text to workers costs more than tokenizing; worker gets file name and byte range, reads, tokenizes, writes own output; parent collects file names. -> A, recap of earlier lesson rule.
- I54 Term EOT token: end-of-text, ID 50256 in GPT-2, marks boundary so model learns "new topic, forget the old". Append after each doc. -> A.
- I55 4.29 characters per token on clean text; English prose with GPT-2-style tokenizer around four; raw wikitext lower (short rare sequences). -> A.

### Packing
- I56 Trainer wants rectangular batch: B rows of exactly T tokens (T 1,024). Naive: one doc per row padded; on Wikipedia most of every batch would be padding, compute on nothing. Term sequence packing: concatenate with separators, cut into fixed rows; no padding; row may hold several docs or part of one. -> A; B's wrong model: "pad, and the mask ignores padding, so fine?" A: the compute is still spent.
- I57 Question: should B's tokens attend to A in same row? -> A raises.
- F6 Figure 006: four docs A(4) B(3) C(7) D(5) each ending in EOT, laid end to end, cut into 12-token rows; C spills into row two. Two masks for row one: causal over whole row (B sees A, cheap, usually fine) and document mask (block-diagonal, each doc sees only itself); row = query, column = key. -> A describes as grid over the phone.
- I58 Plain causal (GPT-2, nanoGPT): simplest, fastest, EOT teaches boundary; most small-scale training; works fine. -> A.
- I59 Document mask: cleaner, matters more for long context with dozens of docs per row; Llama 3 paper used mask preventing cross-document attention; needs kernel support: FlashAttention varlen takes document boundaries as cumulative sequence lengths instead of mask; PyTorch FlexAttention as a mask function. -> A.
- I60 Position IDs: restart per doc (with doc mask) or keep counting (with causal). Doc longer than T spills; lose a little context at the cut. -> A.

### Shards, shuffling, format
- I61 Final format's one job: random batches as fast as GPU eats, never loading whole dataset into RAM. -> A.
- I62 nanoGPT format: one flat binary file of uint16; vocab 50,257, uint16 holds 0 to 65,535, 2 bytes per token; 100M tokens = 200 MB. np.memmap maps file into address space (virtual memory recap: OS loads only pages you touch), slice random offsets; no parsing. Vocab over 65,536 (Llama 3's 128K) needs uint32, file doubles. -> A; gap: bytes. B: "so 56 million tokens is about 112 MB" (derived). Virtual memory recap in plain words.
- I63 Term shards: many files of manageable size (100M tokens each), parallel reads, failed write loses one piece; a few hundred MB each; many loader workers and machines; resume by shard and offset. -> A.
- I64 Formats: raw bin + memmap (pretraining, fastest, simplest); Arrow/Parquet (text plus metadata, filtering; HF datasets uses Arrow with memory-mapping); WebDataset (tar shards read sequentially, streaming from S3, images + text); Mosaic Streaming MDS (deterministic resumable streaming from cloud, multi-node exact resume). -> A, as "when you'd reach for each", not a table read.
- I65 Shuffling: dump roughly creation order; similar articles cluster (communes by same bot same week); dump order = 3,000 communes in a row, loss curve shows it. Want each batch a random sample. -> A.
- I66 Term global shuffle: everything uniformly random; ideal; needs random access; memmap random offsets are a global shuffle nearly free. Term local shuffle: shards in random order, buffer of a few thousand, pop random; only mixes what fits; sorted shards need buffer bigger than a cluster or shuffle at write time. -> A.
- I67 Robust recipe: shuffle documents globally once when writing shards, cheap local shuffle at read; seed everything for resume. -> A.

### Mixtures and epochs
- I68 Term data mixture: proportions sampled from sources (50% web, 20% code, 10% books), chosen separately from size; small high-quality up-sampled; huge noisy down-sampled. Llama 3 final mix: about half general knowledge, a quarter math and reasoning, 17% code, 8% multilingual. Found by ablation; research to learn them (DoReMi 2023). -> A.
- I69 Muennighoff et al. 2023: up to about four epochs almost as good as fresh, falls off steeply after; upsample Wikipedia 2-3 times common, 40 not. -> A; B asks how many times you can repeat.
- PR3 Predict raw vs clean, same tokens, eval on clean held-out: clean wins clearly (raw spent budget on markup, puts probability on braces/brackets/pipes, costs loss on every clean token); a few tenths of a nat at small scale (check; depends). Eval on raw held-out: raw model wins easily. "Better" defined by eval distribution; decide before choosing data. Nat = unit of loss (natural log). -> A asks, B answers first half right, misses the second; A reveals.

## Build It

- B0 Everything in workbench/data; venv; numpy, mwparserfromhell, datasketch, tiktoken, optional fasttext with lid.176.ftz. Pipeline on Mac, copy shards to Spark for training. Rough time two evenings. -> A, one sentence.
- B1 Structure: each stage a function from one doc to one doc or nothing, run by worker pool, plus global work in parent (exact dedup, LSH, decontam). Log time per stage per doc from the start. -> A.
- B2 t0 (setup): download, stream XML once into one JSON line per article (only namespace zero, not redirects, clear each page), so later stages don't pay bzip2 again; around 285,000 articles, 1.1 GB file. -> A, one-two sentences.
- B3 t1 extract/normalize (yours): parse, remove top-level templates, drop tags (ref, table, gallery, math, references, timeline), drop file/image/category/media links, strip code turns links into visible text, drop leftover table lines. Normalize as described. Hints: removing an already-removed node raises an error, catch it; print 20 random extracted articles and read them (stray "thumb" fragments, empty References headings, empty parentheses where a template sat); fix common ones, stop when rare, write down fixes; compare token counts, about 18% kept. -> A, the part that matters is reading samples.
- B4 t2 filters: one flag per failed rule (short under 50 words, mean word length outside 3-10, under 80% alphabetic, fewer than 2 distinct stop words, over 30% repeated lines); compute all, not first failure, to answer "fails only alpha?" and toggle without rerun. Optional fastText at 0.65, newlines replaced by spaces; under NumPy 2 predict errored, lower-level call works, check package. Print five failures per rule. Stop-word rule fired most, about 35,000, one sentence plus a stats table (footballer club career); length caught 100,000 stubs. -> A; B: "why all flags?" is a natural real question.
- B5 t3 MinHash your own then datasketch: 5-word lowercased shingles; hash each to 64-bit int mod a Mersenne prime (two to the 61 minus one), apply k permutations as a times x plus b mod P, take min; overflow trap in 64-bit multiply; LSH keys per band. Parent: dict bucket -> doc list, union-find over candidates verified at 80% agreement, keep first per cluster. datasketch 2.0 changed rebuilding from stored hashes (pass scheme), read docs. Agent reviews overflow and band hash ignoring rows. Print five biggest clusters: you'll recognise them. -> A, overflow bug said in words; Mersenne prime explained briefly.
- B6 t4: hold out 1% by md5 of id mod 100 equals zero, before filtering decisions leak (not Python's hash, randomised per process); keep only eval articles passing filters (clean eval); never train on them. 13-gram set (store hash of each), flag, print ten flagged pairs, decide if leakage. Two PII regexes, print 20 matches, tighten phone regex eating years and ISBNs. -> A; B asks why not Python's hash.
- B7 t5: tokenize_file reads a chunk, encode ordinary, append EOT, concatenate to uint16, write. Main: split into about workers times four chunk files after seeded global shuffle; process pool maps paths in, counts out; concatenate to train.bin and eval.bin or shards of about 50M tokens; assert every token under 65,536 before casting. Reader: memmap, random offsets, x = slice, y = same slice shifted one. Raw version: tokenize raw wikitext into raw_train.bin, baseline. -> A; y-shifted-by-one said in words.
- B8 t6: wrap each stage in perf_counter, sum CPU per stage across workers, measure global stages and pool wall time; py-spy top on a running worker; agent may explain, not change. -> A.
- B9 t7: on Spark, two identical models from tiny LM lesson (raw_train.bin vs train.bin), same architecture, seed, batch, same number of training tokens (repeat clean up to about two epochs fine); 6 layers, 384 wide, T 512, 50-100M tokens, about an hour. Evaluate every few hundred steps on clean eval and raw-wikitext version of same held-out articles; four curves; five samples each same prompts; agent reviews for unfairness (token counts, eval batches, training on eval data). -> A.
- B10 Done when: three files exist with token counts and MB known; five biggest clusters and one contaminated pair; timing table and which stage dominates; four eval curves on one plot. -> Folded into A's description, not read as a checklist.

## Measure

- M1 Setup: M4 Pro, 10 performance plus 4 efficiency cores, 10 worker processes, other heavy jobs running: absolute pessimistic, ratios the point. -> A.
- M2 Timings: bzip2+XML about 100 s wall one process; extract 4,503 CPU-s, 87%; normalize 49 s, 0.9%; language ID 125 s, 2.4%; quality rules 83 s, 1.6%; PII 64 s, 1.2%; MinHash 366 s, 7.1%; LSH + clustering 27 s wall; decontam 17 s wall; tokenize 8 s wall. -> B predicts tokenizing dominates (wrong model); A reveals with comparisons, not reading row by row.
- M3 Why: parse tree in pure Python far more work per byte; MinHash second (few thousand shingles 128 ways); tokenizing rounding error (Rust, GIL released). Expensive part is understanding the format; clever-sounding parts cheap. Twenty times faster (full English Wikipedia): attack extraction (more processes, faster extractor, pre-extracted text). -> A.
- M4 Scaling: per-doc stages scale with cores; 20 Spark cores roughly twice the Mac's throughput (efficiency cores help less). LSH/decontam global, one process here; at web scale distributed by partitioning buckets across machines (datatrove, FineWeb's library). -> A.
- M5 Funnel: articles 285,478 / 373.2M raw; extracted minus eval 283,730 / 68.5M; + language 279,646 / 67.1M; + length 179,083 / 62.7M; + quality 172,389 / 58.4M; + exact 172,384 / 58.4M; + near 172,328 / 58.4M; + decontam 167,563 / 56.3M. -> A narrates the shape, key numbers only.
- M6 Three checks: extraction removes more than half tokens; length removes many docs few tokens (35% docs, 6.5% tokens); near-dedup alone far more than exact (13,468 vs 186) but almost nothing after length. Workers stage 536 s wall with 10 processes; quiet machine well under. -> A.
- M7 Raw vs clean table to fill; author hasn't run the pair on the Spark, no numbers to match. Expect clean wins on clean eval, loses badly on raw eval; raw samples full of markup. If clean doesn't win: check same token count and eval articles excluded from both. -> A, honest.

## Break It

- K1 Skip near-dedup: retrain without it, prompt "Achicourt is a commune. It is in", no-dedup model completes template word for word; turn length filter off too to keep stubs (else near-dedup barely matters). Training loss drops faster than validation: memorising repeated text. -> "what if" exchange.
- K2 Dump order: sequential reader over unshuffled train.bin; loss gets texture: sudden drops on runs of stubs, bumps leaving; why shuffling matters, why small local buffer isn't enough. -> exchange.
- K3 Contaminate on purpose: append eval articles three times, retrain; eval loss drops well below clean run, new text (newer dump articles) doesn't improve; looks better and isn't; what to look for when a paper's number seems too good. -> exchange.
- K4 Forget normalization: skip NFC and whitespace, rerun exact and MinHash; exact misses more (one invisible char changes hash), odd whitespace docs non-matching shingles; small on Wikipedia (editors/bots consistent), not on web. -> exchange.

## Explain It Back (substance must appear)

- E1 Data over model tweaks at fixed compute: fixed tokens; model learns distribution; markup/boilerplate/duplicates spend capacity; cleaning makes each token teach more; dedup stops thousands-fold upweighting; decontam keeps measurements honest; C4 and FineWeb ablations. -> Garbage-in section + ending.
- E2 MinHash for a newcomer: 5-word phrases, Jaccard, random order, first phrase, probability = Jaccard, 128 seeded hashes taking minimum, within about plus or minus 0.05, tiny fingerprint. -> MinHash section; B restates.
- E3 Billion docs: MinHash per-doc parallel; LSH bands; collision formula S-curve; bucketing is a hash join, linear; partition by band across machines; distributed union-find; FineWeb 14 bands of 8 over trillions. -> LSH + Measure scaling; B asks "a billion?"
- E4 Pipeline takes 10 hours: measure per-stage CPU first; usually format handling or model filter, not tokenizing/hashing; worker processes (threads only if native and GIL released); paths not data; cheapest filters first; cache intermediate to avoid re-decompressing; global stages partition by hash; check I/O: compressed read on one core is a ceiling. -> Measure section, B asks the question as his own.
- E5 Packing trade-off: as in I56-I60; summarised. -> Packing section.

## Go Deeper / Connections

- G1 FineWeb paper + blog (best single resource); Mining of Massive Datasets chapter three for MinHash/LSH. -> One closing sentence before the ending.
- C1 Connections: feeds "why evals are separate" (contamination further), draft model (distillation data choice); same skill for the cross-encoder at work: dedup query-document pairs, check eval queries don't leak, look at fifty random examples. -> A, near the end, cross-encoder tie-in.

## Flow

1. Problem scene (P1-P6): samples full of braces, French villages, too-good val loss; B: bigger model? A: no.
2. Origin (O1-O7), story arc.
3. Garbage in (I1-I3): distribution in plain words; duplicates as upweighting.
4. Assembly line (F1, I4).
5. Acquisition (I5-I10).
6. Extraction (I11-I15, F2), eighty percent markup reveal.
7. Normalization (I16-I19).
8. Language ID (I20-I21).
9. Rules (I22-I26).
10. Classifier (I27-I30).
11. Exact dedup (I31-I32).
12. MinHash (I33-I37, F3, PR1).
13. LSH (I38-I42, F4), PR2, FineWeb snapshot surprise (I43).
14. PII (I44-I45).
15. Decontam (I46-I50), funnel figure (F5).
16. Tokenizing (I51-I55), GIL recap.
17. Packing (I56-I60, F6).
18. Format and shuffling (I61-I67), memmap recap.
19. Mixtures/epochs (I68-I69), PR3.
20. Build It (B0-B10).
21. Measure (M1-M7), E4 woven in.
22. Break It (K1-K4).
23. Go Deeper + Connections (G1, C1).
24. Ending: B restates core idea, A sharpens, stop.
