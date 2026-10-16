# Coverage: tokenizers

Lesson src/lessons/tokenizers.mdx vs podcast/scripts/tokenizers.md. Item IDs match
podcast/outlines/tokenizers.md. All numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs, embedding table | Token is an ID | "It picks a row out of that embedding table you built" | covered |
| P1 50,257 by 768 copied | Problem | "fifty thousand two hundred fifty-seven rows, by seven hundred sixty-eight" | covered |
| P2 strawberry 1 vs 3 tokens, 73700 | Problem | "One number, seventy-three thousand seven hundred" | covered |
| P3 UDHR 33 / 429 / 279 / 78; 8x, an eighth | Problem | "you paid about eight times... about an eighth of the context window" | covered |
| P4 one preprocessing step | Problem | "All of it comes out of this one small, kind of unglamorous preprocessing step" | covered |
| O1 Gage 1994 | Origin | "February nineteen ninety-four. A guy named Philip Gage" | covered |
| O2 NMT unknown words, German compounds | Origin | "German loves compounds" | covered |
| O3 Sennrich 2015/ACL 2016; GPT-2 2019 bytes | Origin | "moved it back down to raw bytes" | covered |
| I1 token, vocabulary, tokenizer | Token is an ID | "a token is really two things at once" | covered |
| I2 embedding row, 768 | Token is an ID | "the only thing the model ever knows about the token" | covered |
| I3 letters: ~4x, 16x attention, t-h-e | Letters vs words | "Sixteen times the attention work" | covered |
| I4 words: 9,538 / 3,252 / 6,776; millions; UNK | Letters vs words | "Nine thousand five hundred thirty-eight different words" | covered |
| I5 Figure 001 three granularities | Letters vs words | "thirty-five little boxes... five boxes... seven boxes" | covered |
| I6 subwords; let data decide | Letters vs words | "let the data decide. Merge whatever shows up together most often" | covered |
| I7 letters are a trap | Letters vs words | "They're a trap" | covered |
| I8 Unicode code points, ~150,000 | Bytes | "About a hundred and fifty thousand characters have been assigned" | covered |
| I9 UTF-8 1-4 bytes, ~1.1M | Bytes | "Code points go up to about one point one million" | covered |
| I10 Predict 18 bytes | Bytes | "Six code points, three bytes each, eighteen bytes" | covered |
| I11 Figure 002 leading bits, continuation 10 | Bytes | "every continuation byte, starts with one, zero" | covered |
| I12 256 base, byte-level BPE, who uses it | Bytes | "exactly two hundred fifty-six entries" | covered |
| I13 Telugu 18 tokens before merges | Bytes | "sees the word Telugu as eighteen tokens" | covered |
| I14 algorithm, hello pairs, merge defined | BPE training | "the pairs are h-e, e-l, l-l, and l-o" | covered |
| I15 256 + merges, 50,000 + 1, merges are the tokenizer | BPE training | "Two fifty-six plus fifty thousand is fifty thousand two hundred fifty-six" | covered |
| I16 Figure 003 toy corpus | BPE training | "\"low\" five times, \"lower\" twice, \"newest\" six times" | covered |
| I17 Predict e+s/s+t tie, est, l+o | BPE training | "E-s and s-t are both nine. The tie goes to the pair seen first" | covered |
| I18 compression; order matters | BPE training | "The symbol count in the corpus drops with every merge" | covered |
| I19 encoding earliest merge | Encoding | "the one whose rule was learned earliest" | covered |
| I20 why earliest (#500 / #12) | Encoding | "That space-t-h token only exists because merge number twelve created it" | covered |
| I21 decoding concat then decode | Encoding | "Glue first, decode after" | covered |
| I22 Figure 004 slider | Encoding | "a slider from zero merges up to one thousand twenty-four" | covered |
| I23 Predict 65 -> 23, 2.8; Telugu 76 stays | Encoding | "Twenty-three. About two point eight bytes per token"; "Seventy-six. It doesn't move" | covered |
| I24 no boundaries: "of the", etc; dog variants | Pre-tokenization | "dog-period, dog-exclamation-mark" | covered |
| I25 pre-tokenization defined | Pre-tokenization | "That's called pre-tokenization" | covered |
| I26 GPT-2 pattern in words; space at front | Pre-tokenization | "The last space gets left behind to stick to the front of the next word" | covered |
| I27 cl100k changes; example line | Pre-tokenization | "cuts the year into two-oh-two, and then six" | covered |
| I28 special token, endoftext 50256 | Special tokens | "ID fifty thousand two hundred fifty-six" | covered |
| I29 chat template | Special tokens | "that's called a chat template" | covered |
| I30 Figure 005 ChatML, 151644/151645 | Special tokens | "one hundred fifty-one thousand six hundred forty-four" | covered |
| I31 cliffhanger, Llama 3 format, silent failure, Qwen default, injection | Special tokens | "It's a cliffhanger"; "You are Qwen, created by Alibaba Cloud" | covered |
| I32 WordPiece, BERT Telugu 17 UNK | Families | "Seventeen tokens for the whole sentence" | covered |
| I33 SentencePiece, Unigram | Families | "works backwards from B P E" | covered |
| I34 shared idea; why byte BPE won | Families | "frequent things get short codes" | covered |
| I35 bigger vocab: shorter seqs, KV cache | Vocab size | "the K V cache is the memory where the model keeps" | covered |
| I36 bigger matrices, output layer, rare rows | Vocab size | "its row gets fewer training updates" | covered |
| I37 table GPT-2 / Qwen / Llama 3 | Vocab size | "about one point oh five billion. Out of about eight billion" | covered |
| I38 Llama 3 15%, vocab growth list | Vocab size | "about fifteen percent fewer tokens" | covered |
| I39 cost in tokens, 4 chars, 0.75 words | Effects | "roughly three quarters of a word" | covered |
| I40 spelling, spaced letters | Effects | "every letter becomes its own token" | covered |
| I41 arithmetic splits, carry from right, Llama digits | Effects | "the groups line up from the left, but the carry goes from the right" | covered |
| I42 whitespace 35 vs 23 | Effects | "thirty-five tokens with GPT-2 against twenty-three" | covered |
| I43 Figure 006 numbers | Effects | "Hindi is two hundred ninety-six, nine times English" | covered |
| I44 2.4x, Petrov 10x | Effects | "gaps of ten times or more" | covered |
| I45 SolidGoldMagikarp 43453, davidjl | Glitch tokens | "ID forty-three thousand four hundred fifty-three" | covered |
| B0 setup, regex, corpus, held-out | Build It | "compression measured on the text you trained on flatters you" | covered |
| B1 bytes in shell, partial decode | Build It | "A slice of a character's bytes isn't text" | covered |
| B2 trainer, overlap case, verbose, 256 on 100 KB | Build It | "New, one. Walk with an index" | covered |
| B3 encode/decode, round trip, surrogates, nasty strings | Build It | "ten thousand spaces in a row" | covered |
| B4 regex + dedup, 60 s, specials, 4,096 | Build It | "about sixty seconds on a Mac" | covered |
| B5 match tiktoken, recover merges, 220, 49,730 | Build It | "matched all forty-nine thousand seven hundred thirty tokens" | covered |
| B6 compare.py, BERT UNK count | Build It | "counts how many unknown tokens BERT spits out" | covered |
| B7 chat template inspection | Build It | "drop the system message and watch the default one appear" | covered |
| B8 letter counting, addition, not run | Build It | "the lesson didn't run the model side of it" | covered |
| B9 done when | Build It | "And you're done when the round trip holds" | covered |
| M1 bytes per token table | Measure | "Bytes of text divided by number of tokens" | covered |
| M2 reference numbers | Measure | "two point seven bytes per token on that same prose" | covered |
| M3 expectations | Measure | "A small vocab with the right data can beat a big vocab" | covered |
| M4 timing vs merges, diminishing returns | Measure | "roughly in a straight line with the number of merges" | covered |
| M5 cost of being Telugu | Measure | "cost per million paragraphs" | covered |
| K1 per-token decode, incremental decoder | Break It | "incremental U T F eight decoder" | covered |
| K2 no pre-tokenization, dog count | Break It | "one word smears across a bunch of unrelated tokens" | covered |
| K3 wrong merge order | Break It | "A round trip proves you didn't lose any information" | covered |
| K4 smuggled special token | Break It | "split special tokens"; "raises an error unless you explicitly allow" | covered |
| E1-E6 explain-it-back substance | throughout | see I1-I6, I14-I21, I40-I41, I35-I38, I43-I44, I45 | covered |
| G1 Karpathy video + minbpe | Close | "Karpathy's two-hour video" | covered (Sennrich paper named in Origin) |
| C1 connections | Close | "Prefix caching only works if the chat template renders" | covered |

Derived numbers not written in the lesson: "Hi, Telugu a, emoji" is six characters and eleven bytes (B1);
first toy merge removes nine symbols (I18); a thousand tokens is about seven hundred fifty words (I39).
