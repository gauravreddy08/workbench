# Coverage: kv-cache

Lesson src/lessons/kv-cache.mdx vs podcast/scripts/kv-cache.md. Item IDs match
podcast/outlines/kv-cache.md. "Fixed" = was missing or wrong in the first draft and has been corrected.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (prefill/decode, ridge point re-explained) | Prefill; Why not 500x | "Prefill is the part where the model reads your prompt"; "Divide the first by the second and you get a number called the ridge point" | covered |
| P1 naive loop | Problem | "you hand the model the whole sequence so far" | covered |
| P2 170 s; 17 / 160 / 360 ms; twenty times | Problem | "about a hundred seventy seconds to write a thousand tokens" | covered |
| P3 twenty lines, 12 s, same tokens | Problem | "you change about twenty lines of code, and the same thousand tokens take twelve seconds" | covered |
| P4 Predict step-500: 511 of 512 | Problem | "Five hundred eleven out of five hundred twelve positions" | covered |
| P5 n squared over 2; ~500x; measured 14x | Problem | "roughly five hundred times more matrix work"; "only fourteen times" | covered |
| P6 KV cache named; diagnostic right; deeper questions | Problem | "That was your answer in the diagnostic too" | covered |
| O1 2017, tensor2tensor fast decoding | Origin | "a library called tensor two tensor" | covered |
| O2 Shazeer 2019, reading cache is the bottleneck, MQA | Origin | "It's slow because at every single step, the hardware has to read the whole cache" | covered |
| O3 GQA 2023, windows, quantized, DeepSeek 2024 | Origin | "Grouped-query attention in twenty twenty-three as a middle ground" | covered |
| I1 librarian, label + summary | Librarian | "A short label, what this note is about. And a summary" | covered |
| I2 rewriting every card | Librarian | "throws away all her index cards, rewrites every single one" | covered |
| I3 keys / values / query defs, softmax, weighted average | Librarian | "The labels are the keys... The summaries are the values... the new token's query" | covered |
| I4 attention in words, root head size | What one token needs | "divided by the square root of the head size" | covered |
| I5 Predict: K and V yes, Q never | What one token needs | B: "All three?"; A: "Queries, no. Never." | covered |
| F1 score triangle, bottom row | What one token needs | "a decode step, making one new token, only adds the bottom row" | covered |
| I6 causal mask, minus infinity | Why cards never change | "set the scores for later positions to minus infinity" | covered |
| I7 induction, four steps | Why cards never change | "the input to layer zero is the embedding of token i plus the position embedding" | covered |
| I8 frozen, immutable | Why cards never change | "The word for that is immutable" | covered |
| I9 two conditions, BERT | Why cards never change | "Which is why BERT doesn't have one of these?" | covered |
| I10 RoPE, cache after rotation, HF Llama | Why cards never change | "You cache them after rotation, and that's what Hugging Face's Llama does" | covered |
| I11 per layer, 12 keys x 12 heads | Why cards never change | "There's no single 'key of token i.'" | covered |
| I12 prefill | Prefill/decode | "You run the whole prompt through the model in one forward pass, exactly like training" | covered |
| I13 decode | Prefill/decode | "You feed in only the newest token, as a sequence of length one" | covered |
| I14 shape; GPT-2 and Llama shapes; grows by one | Prefill/decode | "Batch, number of key-value heads, sequence length, head size" | covered |
| F2 stack of 12 sheets, 72 KiB per token | Prefill/decode | "That comes out to seventy-two kilobytes. Per token." | covered |
| I15 position bug, arange | Prefill/decode | "you need it to count from the length that's already in the cache" | covered |
| I16 T by S mask, chunks, spec decoding, off by past_len | Prefill/decode | "it's wrong by exactly the number of cached tokens" | covered |
| F3 stepper: prompt, on/off, wasted counter, 2,000 vs a million | Step through it | "about two thousand key and value vectors... Without it, about a million" | covered |
| I17 three things to notice | Step through it | "Three things to notice. One, prefill is the same picture either way" | covered |
| I18 FLOP, 2 per weight, 124M params | Counting | "about a hundred twenty-four million parameters" | covered |
| I19 no-cache vs cached cost per step | Counting | "Without a cache, at length n, you push all n tokens through" | covered |
| I20 per step vs total, n squared to n | Counting | "total cost goes from about n squared to about n" | covered |
| I21 37M vs 250M; reads whole cache; 128K bigger than weights | Counting | "About thirty-seven million FLOPs"; "that read is bigger than the weights" | covered |
| I22 500 vs 14 | Not 500x | B: "Okay, so now the five hundred versus fourteen thing." | covered |
| I23 roofline, ridge point, idle math | Not 500x | "Doing ten tokens of math instead of one is nearly free" | covered |
| F4 measured chart, four lines, 358 / 81 ms, 8-16 ms | Not 500x | "ending at about eighty milliseconds"; "between eight and sixteen milliseconds" | covered |
| I24 table: 170/12.0, 52/12.3, identical | Not 500x | "GPU, fifty-two without, twelve point three with" | covered |
| I25 overhead-bound, ~10 ms kernel launches | Not 500x | "all that launching is about ten milliseconds' worth" | covered |
| I26 Predict spark-knee: 16 GB, 59 ms, bend at ridge, slope after | Not 500x | "the bend should land near your measured ridge point, just read as a number of tokens" | covered |
| I27 memory formula | Memory | "two, for keys and values, times the number of layers" | covered |
| I28 five model rows | Memory | "Llama two seven B... Five hundred twelve kilobytes per token. Two gigabytes" | covered |
| I29 73,728 bytes, 1,011 positions, 74.5 MB | Memory | "exactly seventy-three thousand seven hundred twenty-eight bytes per position" | covered |
| I30 linear; per-user; capacity and bandwidth; two-for-one | Memory | B: "memory's kind of the boring part"; A: "buys you two things at once" | covered |
| I31 four knobs | Share the keys | "Four knobs. Layers, key-value heads, head size, bytes per number." | covered |
| I32 MHA | Share the keys | "multi-head attention gives every head its own queries, keys and values" | covered |
| I33 MQA, 32-fold, quality, PaLM, Falcon 7B | Share the keys | "Google's PaLM, and the seven B version of Falcon" | covered |
| I34 GQA, 8 groups of 4, 4x, Llama 2 70B only, repeat but cache small | Share the keys | "the cache stores the small, unrepeated version" | covered |
| F5 KVHeads figure and things to try | Share the keys | "Now drag users up to sixteen. With M H A, the caches outweigh the model" | covered |
| I35 MLA | Share the keys | "multi-head latent attention, M L A, from DeepSeek V two" | covered |
| I36 sliding window, Longformer 2020, Mistral 4,096 | Distant past | "a window of four thousand ninety-six" | covered |
| I37 ring buffer, 512 MiB cap | Distant past | "the cap is five hundred twelve megabytes per conversation" | covered |
| I38 L times W, rumor, lossy | Distant past | "Kind of like a rumor passed down a line of people" | covered |
| I39 Gemma 2 alternates; Gemma 3 five local (1,024) per global | Distant past | "five local layers, with a window of a thousand twenty-four" | covered |
| I40 FP8 halves, vLLM cache dtype, check docs | Fewer bits | "V L L M exposes it as a cache data type setting" | covered |
| I41 KIVI per channel / per token, ~2 bits; cost; quantization lesson | Fewer bits | "quantizes keys per channel, and values per token" | covered |
| I42 torch.cat copies whole cache | Real code | "Each cat allocates a brand-new tensor and copies the whole old cache" | covered |
| I43 preallocate/static/compile, chunks, PagedAttention | Real code | "Hugging Face calls that a static cache" | covered |
| B1 laptop then Spark, files | Build It | "Laptop first... Then the Spark." | covered |
| B2 task 1, 9e-5, transpose | Build It | "about nine times ten to the minus five" | covered |
| B3 task 2, three forwards | Build It | "You change three forward functions" | covered |
| B4 hints | Build It | "Concatenate along the sequence dimension, which after the transpose is dimension two" | covered |
| B5 task 3, equality, 1e-5 logits, near-tie, top-2 | Build It | "A near-tie is a rounding story. A big gap is your bug." | covered |
| B6 task 4, sync, 850 ms warmup, medians | Build It | "up to eight hundred fifty milliseconds while things warmed up" | covered |
| B7 task 5, cache_bytes, allocator, XL, batch 8 | Build It | B: "four point seven megabytes per token?" | covered |
| B8 task 6, DynamicCache, (1, 8, len, 128) | Build It | "Eight key-value heads, not thirty-two. That's G Q A" | covered |
| B9 use_cache default, 64/256/1,024, 3.1 vs 14.8 s | Build It | "three point one seconds with the cache and fourteen point eight without" | covered |
| B10 ablation row goes backwards | Build It | "It's the only row in the whole track that's supposed to go backwards." | covered |
| B11 task 7 preallocate, review | Build It | "keep a write pointer" | covered |
| B12 done when | Build It | "So you're done when the two loops give identical tokens" | covered |
| M1 Mac latency table | Measure | "about seventeen milliseconds at position one, thirty at a hundred" | covered |
| M2 memory table | Build It (task 5) / Memory | "four point seven"; "seventy-four and a half million bytes" | covered |
| M3 hockey stick | Measure | "should be a hockey stick, not a straight line" | covered |
| M4 flat-ish, 8 to 16 ms, copying | Measure | "the cached curve is flat-ish, not flat" | covered |
| M5 Llama short barely hurts, couple of times at 1,024 if bend near 200 | Measure | "a couple of times longer than the cached one" | covered |
| M6 straight line, allocator steps | Measure | "PyTorch's caching allocator grabbing memory in blocks" | covered |
| K1 forget position offset | Break It | "Every new token now thinks it's at position zero." | covered |
| K2 remove mask; subtle two-chunk version | Break It | "the two-chunk prefill silently gives different logits" | covered |
| K3 cache too much | Break It | "You've more than doubled the cache" | covered |
| K4 bf16 near-tie | Break It | "B F sixteen keeps only about three significant digits" | covered |
| E1 contents, why not queries | What one token needs; close | "Past queries never get read again" | covered |
| E2 valid / when not, incl. editing earlier text | Why cards never change; Connections | "editing earlier text in a conversation, the cache is invalid from that point on" | fixed (editing + eviction added) |
| E3 scaling, n cubed attention without | Counting | "attention... goes from about n cubed without a cache to n squared with it" | fixed (attention totals added) |
| E4 90 users vs 22, step time grows | Share the keys | "So roughly ninety users"; "about twenty-two users" | covered |
| E5 MQA vs GQA vs window, all stack with fewer bits | spread; close | B's restatement; "every one of those shrinking tricks pays off twice" | covered |
| G1 Shazeer, Pope et al. | Connections | "Efficiently Scaling Transformer Inference" | covered |
| C1 next lessons | Connections | "the memory math episode turns that formula into a real capacity plan" | covered |

Number check: every number in the script matches the lesson, except the KVHeads readout values
(one gigabyte and about sixteen tokens a second at one user; sixty-four gigabytes and about three tokens
a second for MHA at sixteen users; sixteen gigabytes and about eight a second for GQA at sixteen users),
which are computed from the figure's own formula (spec-sheet 273 GB/s, 16.06 GB weights) and are what
the figure displays. "Eighty milliseconds" rounds the figure's 81 ms.
