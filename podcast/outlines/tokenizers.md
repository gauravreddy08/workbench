# Outline: tokenizers

Source: src/lessons/tokenizers.mdx. Curriculum entry: "Tokenizers." Question: what is a token, and how
does a tokenizer decide where words split? Why: token counts set your costs, context limits and odd
model failures (spelling, numbers). Build: BPE from scratch, trained on your own text.

Each item: what the lesson teaches -> how it is said aloud.

Diagnostic gaps touched: Numbers (bytes per character, bytes per token, vocab share of params: say
every number with a comparison). ML fuzzy: memory math for models (V times d embedding rows), why
decoding cost grows with tokens. B voices the natural wrong models: "a token is basically a word",
"the model sees the letters", "if decode round-trips, the encoder is right", "a bigger vocab is just
better".

## Today / prerequisites

- T1 Prereqs: Python, embedding table from his GPT-2 build. Runs on Mac; Spark only for last task. -> Not read; A re-explains the embedding table in one breath where it comes up (I2).

## The Problem

- P1 His GPT-2's first line: embedding of fifty thousand two hundred fifty-seven by seven hundred sixty-eight. Where did 50,257 come from? Copied from the paper. -> A opens with it.
- P2 tiktoken, cl100k (GPT-4): " strawberry" with a leading space is one token, ID 73700; "strawberry" without is three tokens (496, 675, 15717). Model never sees the letters; sees one number. Then people ask about r's. -> A tells it; B voices "it sees the letters"; A corrects. IDs said once, the 73700 one.
- P3 UDHR Article 1: English 33 tokens for GPT-2, GPT-4, GPT-4o alike. Telugu 429 GPT-2, 279 GPT-4, 78 GPT-4o. Telugu on GPT-4 paid about eight times, got an eighth of the context. -> A; this lands for him personally (Telugu).
- P4 Cost, context, spelling, arithmetic, language fairness, glitch-token bugs: all one preprocessing step. -> A, one line.
- O1 1994, Philip Gage, "A New Algorithm for Data Compression", The C Users Journal, February. Most common adjacent byte pair -> unused byte value, write down the substitution, repeat. Simple, fast to decompress, forgotten. -> A story.
- O2 Twenty years later NMT: vocab of 30-50K most common words, rest to one unknown symbol; names, rare words, German compounds untranslatable. -> A.
- O3 2015 Sennrich, Haddow, Birch at Edinburgh, "Neural Machine Translation of Rare Words with Subword Units", ACL 2016: Gage's loop on characters inside words. Frequent words one symbol, rare words few pieces, nothing unknown. 2019 GPT-2 moved it back to raw bytes; nearly every large model today. -> A.

## The Idea

- I1 Network eats numbers. Need a way to cut text and a fixed list numbering every piece. Token = chunk treated as one unit and its integer ID (letter, word, part, space, raw bytes). Vocabulary = fixed list, IDs zero to V minus one, size chosen before training and baked into first and last layers. Tokenizer = program that cuts and numbers both directions; trained separately, before the model exists. -> A, with B's "token is a word" wrong model.
- I2 Each ID picks a row of the embedding table: learned vector of 768 numbers. Only thing model knows. " strawberry" = one vector; doesn't know three r's unless it learned it from text where it's spelled out. -> A.
- I3 Letters: tiny vocab (a few hundred covers most alphabets), nothing unknown, but English averages a bit under four characters per GPT-4 token, so four times the positions: four times less text in context, generation four times slower (each letter one forward pass), attention grows with square of length so about sixteen times the attention work. Model relearns t-h-e is a word. -> A, worked out with B on the squaring.
- I4 Words: short sequences, whole meaning. But counted distinct words in site's lesson prose, about 1.3 MB: 9,538 distinct, 3,252 appeared once; first half alone 6,776 so still growing. Web text: names, typos, numbers, URLs, hashtags, word forms (tokenize/tokenizes/tokenizing/tokenizer/tokenizers). Millions of entries, each its own row trained from few appearances. Missing words -> unknown token [UNK], one placeholder vector, meaning lost. -> A; B asks for the number.
- I5 Figure 001: same sentence "Tokenizers are unbelievably useful." three ways. Characters: 35 pieces, vocab hundreds. Words: 5 pieces, "Tokenizers" became UNK, meaning gone. Subwords (cl100k): 7 pieces: Token, izers, " are", " unbelie", "vably", " useful", period. -> A describes like over the phone.
- I6 Subwords: common words whole, rare from frequent pieces; short sequences, manageable vocab, any word buildable. BPE's answer: let the data decide, merge what appears together most. -> A.
- I7 But smallest unit first: letters are a trap. -> A signpost.
- I8 Unicode: every character a number, a code point. "a" U+0061, Telugu "అ" U+0C05, grinning emoji U+1F600. About 150,000 characters assigned, including emoji. -> A; hex said as "hex zero C zero five" sparingly.
- I9 Code points up to about 1.1 million, don't fit a byte. UTF-8: variable length, 1 byte English, 2 accented Latin/Greek/Cyrillic/Arabic/Hebrew, 3 most other scripts (Hindi, Telugu, Chinese, Japanese), 4 emoji and rarer. ASCII text is already valid UTF-8. -> A.
- I10 Predict: bytes in "తెలుగు"? Looks like 3 letters. Answer 18: six code points (consonant + vowel sign, three times; vowel signs are their own code points), 3 bytes each. Hindi same. First reason Indian languages expensive: about three times bytes per character before tokenizer. -> A asks, B guesses nine, A reveals.
- I11 Figure 002: first byte's leading bits say length (0, 110, 1110, 11110); every continuation byte starts with 10. You can always find where a character starts even if you land mid-character. Examples: a one byte, é two, అ three, emoji four. -> A in words, no bit strings read.
- I12 Key move: character floor needs ~150,000 base entries and anything missing is unknown. Byte floor: exactly 256 entries (0-255); every string in any language, emoji, corrupt binary is bytes. Nothing unknown. Byte-level BPE, introduced GPT-2 2019; GPT-2, GPT-4, Llama 3, Qwen, most recent models. -> A; B "two fifty-six covers Telugu?" moment.
- I13 Cost: before merges "తెలుగు" is 18 tokens; everything depends on merges learned. -> A.
- I14 Algorithm: bytes are starting tokens 0-255; count adjacent pairs ("hello": h-e, e-l, l-l, l-o); most frequent gets new ID 256, replace everywhere, record rule (a, b) -> 256 = a merge; repeat, new tokens can pair. Stop at target. -> A, spoken.
- I15 Vocab size = 256 + merges. GPT-2 50,000 merges + one special token = 50,257. Output of training is the ordered list of merges; that's the tokenizer. -> A; closes the P1 loop.
- I16 Figure 003 trainer: Sennrich toy corpus: low x5, lower x2, newest x6, widest x3. Letters not bytes, words separate. Words split into symbols, pair counts weighted by word frequency, click merges top pair, records rule, symbol count readout; editable corpus. -> A describes.
- I17 Predict first merge: e+s (6 + 3 = 9) tied with s+t (9), tie to pair seen first; then es+t -> est (9); then l+o (7). Discovered suffix "-est" with no notion of suffix. -> A asks, B guesses, A reveals.
- I18 Symbol total drops each merge: that's compression (Gage). Merges learned in order, order matters. -> A.
- I19 Encoding: bytes; among adjacent pairs with a rule, pick earliest-learned (lowest merge number); apply everywhere; repeat until none. -> A.
- I20 Why earliest not most frequent in this string: later merges learned on text with earlier merges applied. Merge 500 might be (" th", "ink"); " th" exists only because merge 12 made it. Replaying in order reproduces training pieces. Other orders still decode correctly but produce unseen sequences; model worse. Break It later. -> B voices "most frequent in the input"; A corrects.
- I21 Decoding: look up bytes per ID, concatenate, decode as UTF-8. "Concatenate first, decode after" bites later. -> A.
- I22 Figure 004: 1,024 merges trained byte-level on site's prose (~1.3 MB). Type anything, slider 0 to 1,024; bytes not whole characters shown as hex; filled token = newest merge; presets English, code, Telugu, numbers, strawberry. -> A describes dragging.
- I23 Predict: English preset 65 bytes -> 23 tokens at 1,024 merges, about 2.8 bytes/token. " token", " bytes", " then" single; " merges" still four pieces. First merges: " t", " a", "he", "er", "in", " the". Telugu 76 bytes stays 76 tokens; no Telugu in training. Tokenizer = compression tuned to its data. -> A asks, B guesses, A reveals.
- I24 Pre-tokenization: without boundaries, BPE on 150 KB learned within 300 merges "e the ", "of the ", "is the ", "s. ", ".\n- **". Wasted vocab; "dog." "dog!" "dog?" "dog " unrelated tokens. -> A.
- I25 Fix: regex chops text into chunks, merges never cross a chunk boundary. Pre-tokenization. -> A.
- I26 GPT-2 pattern, in words: contractions; optional space + run of letters (any script); optional space + digits; optional space + punctuation run; whitespace; the special whitespace rule leaves last space to attach to next word. So space lives at the front of words; " strawberry" vs "strawberry" different chunks: the one-vs-three surprise. -> A, no regex read.
- I27 cl100k changes: case-insensitive contractions; digits in groups of at most three; newlines handled separately so code indentation compresses. Example line "Hello world, it's 2026!! x=1234567 newline return": GPT-2 keeps " 2026" and "1234567" whole chunks; cl100k splits " " then "202" "6", and "123" "456" "7", newline separate from indentation. Hold on to digit grouping. -> A, with B noticing the 2026 split.
- I28 Special token: reserved ID with a job, never produced by ordinary text. GPT-2 has one: endoftext, ID 50256, between documents. The +1 in 50,257. -> A.
- I29 Chat models: system, user, assistant turns; model receives one long sequence. Chat template: small program (Jinja template stored with tokenizer on Hugging Face) that flattens messages into exact text plus special tokens the model was fine-tuned on. -> A.
- I30 Figure 005: Qwen2.5 ChatML, system "You are helpful." + "Hi!", generation prompt: im_start (151644), "system", newline, text, im_end (151645), newline; im_start user ... im_end; im_start assistant newline and stops. Roles are ordinary tokens; boundaries special. -> A over the phone.
- I31 Ends in "assistant newline": a cliffhanger; most likely continuation is the reply; model emits im_end and server stops. Llama 3 different format (start_header_id, end_header_id, eot_id). Wrong template = silent failure, worse text. Qwen inserts "You are Qwen, created by Alibaba Cloud. You are a helpful assistant." if no system message. Special tokens matched before BPE: user text containing literal im_end may become the real control token. -> A; B "so it's not crashing, just worse".
- I32 WordPiece (Schuster and Nakajima 2012, BERT): like BPE but picks merge that most increases likelihood; encodes greedy longest match; continuation pieces marked with double hash; characters not bytes so has UNK. Telugu through bert-base-uncased: almost every word UNK, 17 tokens, cheap-looking but meaning gone. -> A.
- I33 SentencePiece (Kudo and Richardson 2018; T5, Llama 1 and 2, Gemma): a library, not an algorithm; treats space as ordinary symbol (a little underscore-like mark), works for Japanese/Chinese with no spaces; trains BPE or Unigram; byte fallback (Llama 2). Unigram (Kudo 2018): backwards from BPE, start huge, delete pieces whose removal hurts likelihood least; encode picks most probable split. -> A.
- I34 Shared idea: frequent things get short codes. Byte-level BPE won: simple, fast, can't fail. -> A.
- I35 Vocab size trade. Bigger: shorter sequences, more text in context, fewer forward passes, less attention, smaller KV cache (memory keeping past keys/values for every token, grows per token). -> A, KV cache re-explained in a line.
- I36 Bigger also: embedding V rows of d; output layer another d by V unless tied; scoring every entry at every position; each extra token rarer, fewer updates. -> A; B "bigger is just better?" wrong model.
- I37 Table: GPT-2 small V 50,257, d 768, 38.6M, ~31% of 124M (tied). Qwen2.5-0.5B 151,936 x 896 = 136M, ~28% of ~494M (tied). Llama 3 8B 128,256 x 4,096 = 525M, untied x2 = 1.05B, ~13% of ~8B. Check config.json yourself. -> A says the three, with "a third", "more than a quarter", "an eighth".
- I38 Small model: vocab is big share. Big model: modest tax; Meta: Llama 3 128K tokenizer (100K from tiktoken + 28K added for other languages) encodes English ~15% fewer tokens than Llama 2's 32K. Growth: GPT-2 50K, Llama 2 32K, GPT-4 100K, Llama 3 128K, Qwen2.5 152K, GPT-4o 200K, Gemma 256K. Wider models shrink relative cost; languages and long contexts make tokens worth more. -> A.
- I39 Cost and context counted in tokens: prices, rate limits, windows. English GPT-4-class: about 4 characters per token, about 0.75 words. Code lower; most non-Latin much lower. -> A.
- I40 Spelling: " strawberry" ID 73700; memorized contents from rare spelled-out text. Spell with spaces: each letter its own token, easier. Modern models often right (trained on the meme, spelling step by step) but weakness remains; reproduce on small model. -> A.
- I41 Arithmetic: GPT-2 split 1234567890 as 123 | 45 | 678 | 90; nearby numbers cut differently, no consistent place value. GPT-4 three-digit groups from the left (123 | 456 | 789 | 0), but carrying goes from the right, so groups don't line up. Llama 1 and 2 split single digits. Active design question. -> A with B working out the carry problem.
- I42 Code and whitespace: GPT-2 tokenizes four spaces as four tokens, eight-space-indented return as eight; GPT-4 has tokens for runs: same line 2 tokens. Small Python function: 35 GPT-2 tokens vs 23 GPT-4. Better code tokenizers learned to compress whitespace. -> A.
- I43 Figure 006: UDHR Article 1 bytes EN 170, HI 500, TE 429. GPT-2: EN 33, HI 296 (9x), TE 429 (13x). cl100k: HI 181 (5.5x), TE 279 (8.5x). Qwen2.5: HI 172 (5.2x), TE 228 (6.9x). o200k: HI 55 (1.7x), TE 78 (2.4x). -> A gives the Telugu line and a couple of Hindi points, not row by row.
- I44 Telugu GPT-2: 429 bytes, 429 tokens, no merge applied. GPT-4 8.5x; GPT-4o's 200K vocab, far more non-English, about 2.4x. More tokens = bill, less context, slower, often worse quality (byte fragments). Petrov et al. 2023: gaps of 10x or more for some language pairs. -> A.
- I45 Glitch tokens: early 2023 Jessica Rumbelow and Matthew Watkins; GPT-3-era models on " SolidGoldMagikarp": refused, replaced with other words, insults. Tokenizer trained on lots of Reddit incl. r/counting; usernames posted thousands of times -> single token (GPT-2 ID 43453). Model data filtered differently, almost never saw it; embedding row near random. GPT-4 tokenizer lacks that one but has " davidjl" (another r/counting username) as a single token. -> A as a story; B asks why the row is junk.

## Build It

- B0 Setup: folder, venv, tiktoken, tokenizers, transformers, regex. regex module understands "any letter" and "any digit" classes; built-in re doesn't. Corpus 1-5 MB: a Gutenberg novel, a few hundred KB of his own Python, Telugu/Hindi Wikipedia. Held-out test files per category not in training; in-sample compression flatters. Karpathy's minbpe as reference, to compare not copy. -> A, one quick stretch.
- B1 Bytes in a shell: "Hi అ 😀" length vs byte length; bit patterns vs figure 002; decoding first two bytes of అ errors; with replace you get a replacement mark. Most important: slice of a character's bytes isn't text; tokens can end mid-character, a token often can't be decoded alone. -> A, with derived numbers (6 characters, 10 bytes).
- B2 Trainer: get_stats, merge, train. Merge must not overlap: [1,1,1] with (1,1) gives [new, 1]; walk with index, skip two. max picks most frequent, ties to first counted. Test on toy corpus first. Print merges verbose; reading first 50 is half the fun. Train 256 merges on 100 KB and time; then do t4 before training big (merges across words). -> A; B tries the overlap case.
- B3 encode/decode: loop while 2+ tokens, pick pair with lowest merge rank, stop when none in merges. decode with replace (model can generate invalid UTF-8). Round-trip 1,000 random Unicode strings (skipping surrogates, which UTF-8 can't encode), plus empty string, single emoji, Telugu, null byte, zero-width space, 10,000 spaces. -> A.
- B4 Pre-tokenization + specials: GPT-2 split; count distinct chunks with a counter, one byte list per distinct chunk, add count per pair; merging touches distinct chunks only. Plain Python: 1,024 merges on 1.3 MB in about 60 s on a Mac. Specials: allowed set, split on special strings first, emit IDs, BPE between; default allow none like tiktoken. Retrain on full corpus at 4,096 (few minutes); save merges in order to a file. -> A; B asks why dedup helps.
- B5 Match tiktoken GPT-2: _mergeable_ranks maps bytes to rank (private, check it exists); recover merges by running BPE on each multi-byte token using only lower-ranked merges; ends in exactly two parts. Gotchas: single-byte IDs not equal to byte values (space 32 is ID 220), need a 256-entry map and inverse; tiny regex differences, print chunk on mismatch. 200 KB mixed incl. Telugu and emoji, identical lists; lesson's encoder matched all 49,730 tokens. Agent review after; read minbpe gpt4.py after. -> A.
- B6 compare.py: bytes per token for yours, gpt2, cl100k, o200k, Qwen, BERT; count BERT UNKs on Telugu. Write yourself, agent explains. -> A, short.
- B7 Chat template: apply to system + "Hi!", print text and per-ID decode, print the Jinja source incl. tools branch; remove system message (Qwen default appears); generation prompt false vs true difference; Llama 3 if gated access. -> A, short.
- B8 Failure: Qwen2.5-0.5B-Instruct on Spark or Mac; words strawberry, bookkeeper, mississippi, referral, nonnegotiable, zzyzx, parallelogram, embarrassment plus ten of his own incl. invented; most repeated letter; plain vs spaced prompt; record token count of the word with leading space. Addition: 20 pairs 3-digit, 20 pairs 9-digit; Qwen splits digits singly vs cl100k threes. Not run by author: expect 0.5B bad plain, noticeably better spaced; frontier model all right is expected and worth thinking why. -> A; B asks why a frontier model gets it.
- B9 Done when: round-trip 1,000 + nasty; GPT-2 match on 200 KB; own 4,096+ tokenizer with first 30 merges explained; comparison table incl. Telugu/Hindi; plain-vs-spaced numbers. -> Folded into the build stretch, one line.

## Measure

- M1 Bytes per token = bytes of text divided by tokens; higher better. Table: yours 1,024 (vocab 1,280), yours 4,096+, GPT-2 50,257, cl100k 100,277, o200k 200,019, Qwen2.5 151,665 across English, code, Hindi, Telugu. -> A, vocab sizes only where useful.
- M2 Reference: own 1,024: 2.7 on its own prose (in-sample, flattering), 1.5 Python, exactly 1.0 Hindi and Telugu. Same prose: GPT-2 3.7, cl100k 4.0, o200k 4.0. Python: GPT-2 2.1, cl100k/o200k 3.2-3.3. UDHR: English 5.2 for all three; Telugu 1.0 GPT-2, 1.5 cl100k, 5.5 o200k. -> A, selected with comparisons.
- M3 Expect: yours loses on English widely (4,096 can't hold many words; tiny corpus). Might beat GPT-2 and even cl100k on Telugu if corpus had Telugu: small vocab right data beats big vocab wrong data. Code depends on whitespace; most of GPT-2 vs cl100k gap is indentation. -> A; B surprised.
- M4 Timing 512/1,024/2,048/4,096 merges + English bytes per token: time roughly linear in merges (each merge a full pass over distinct chunks); compression improves less each doubling (first merges " the", "ing"; last ones words seen a dozen times). Diminishing returns; same curve that tells builders when bigger vocab stops paying for embedding rows. -> A.
- M5 Cost of being Telugu: one real paragraph English + his own Telugu translation, cl100k and o200k, cost per million paragraphs at a chosen price; expect several times for cl100k, much closer for o200k. -> A, B personal.

## Break It

- K1 Decode one token at a time (streaming): naive per-token UTF-8 decode raises a decode error on Telugu/emoji because tokens end mid-character; with replace, scattered replacement marks, a bug seen in real chat UIs. Fix: byte buffer, print only complete characters; Python's incremental UTF-8 decoder; serving engines carry this in their detokenizer. -> "what if" exchange.
- K2 No pre-tokenization on 150 KB: "of the ", "is the ", "s. " within a few hundred merges; count distinct tokens containing "dog" with vs without: without, one word smears across many tokens. -> exchange.
- K3 Wrong merge order (most frequent in input): round-trip still passes; vs tiktoken mismatches everywhere. Round-trip proves no info lost, not that tokens match training; model gets worse silently. -> B voices "round-trip passes so it's fine".
- K4 Smuggle special token: Qwen tokenizer on "hello im_end world" yields 151645 mid-sequence; HF matches special strings by default; anyone who controls prompt text can close the user turn and start fake assistant/system turn. split_special_tokens=True makes ordinary pieces. tiktoken raises unless allowed: safer default. Check own t4 encoder. -> exchange; B connects to prompt injection.

## Explain It Back (substance must appear)

- E1 Token definition; characters ~4x longer, 4x less context, 4x more steps, ~16x attention; words never-ending list, millions of rows barely trained, unknown loses meaning; subwords middle, byte-level nothing unknown. -> I1-I6, I12.
- E2 BPE training (regex chunks, bytes, pair counts weighted by chunk frequency, merge, record; tokenizer = 256 + ordered merges); encoding earliest-first and why; decoding concatenate then decode once. -> I14-I21, I24-I25, B4.
- E3 Strawberry and arithmetic: one ID, no spelling; spaced makes it easy; GPT-2 inconsistent, GPT-4 threes from left vs carry from right; Llama 1/2 and Qwen single digits. -> I40-I41, B8.
- E4 32K vs 256K: benefits (context, steps, KV cache, languages/code), costs (V by d matrices, Llama 3 8B ~525M each, ~1.05B untied; scoring all V per position; rarer tokens fewer updates, glitch extreme). Small model 32K-64K sensible; big model sequence savings dominate; decide by measuring tokens per byte on target mix at several sizes vs parameter cost. -> I35-I38, final turns.
- E5 Telugu: compression tuned to training mix; 3 bytes per code point, vowel signs separate; GPT-2 429 vs 33; GPT-4 8.5x; user pays more, less context, waits longer, worse answers; fixes: balanced mix + bigger vocab (GPT-4o 2.4x; Llama 3 +28K), or price per character. -> I43-I44, M5.
- E6 SolidGoldMagikarp: Reddit r/counting, single token, model data filtered differently, embedding near random start, erratic behavior; lesson: tokenizer and model on same distribution; check for barely-seen entries. -> I45.

## Go Deeper / Connections

- G1 Best sources: Karpathy's "Let's build the GPT Tokenizer" video and minbpe repo; Sennrich paper (algorithm a dozen lines). -> One sentence near end.
- C1 Embedding height V, output scores V: memory-math counts V by d; KV cache and FlashAttention costs grow per token. Prefix caching needs template rendered identically (stray space breaks it). Serving engines hold the incremental detokenizer. Next: train a small LM, choose tokenizer with numbers. -> One or two sentences.

## Flow

1. Problem: fifty thousand two hundred fifty-seven; strawberry; Telugu numbers (P1-P4).
2. Origin story (O1-O3).
3. Token, vocab, tokenizer, embedding row (I1-I2), letters vs words (I3-I6).
4. Bytes: Unicode, UTF-8, Predict Telugu, continuation bits, 256 base (I7-I13).
5. BPE training, toy corpus Predict, encoding order, decoding, slider Predict (I14-I23).
6. Pre-tokenization and the regex, digit grouping (I24-I27).
7. Special tokens, chat templates (I28-I31). Other families (I32-I34).
8. Vocab size trade-off and table (I35-I38).
9. Effects: cost, spelling, arithmetic, code, Telugu, glitch tokens (I39-I45).
10. Build It walk-through (B0-B9), Measure (M1-M5), Break It (K1-K4).
11. Connections, sources, then B restates; A sharpens. End.
