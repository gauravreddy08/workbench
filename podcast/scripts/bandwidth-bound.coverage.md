# Coverage: bandwidth-bound

Lesson src/lessons/bandwidth-bound.mdx (and figures BandwidthStream, BandwidthRoofline) vs
podcast/scripts/bandwidth-bound.md. Item IDs match podcast/outlines/bandwidth-bound.md.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 latency vs bandwidth re-explained | One token | "How long one read takes... that's latency. Bandwidth is how many bytes per second" | covered |
| T2 GPU call returns when queued; synchronize | Build It | "the call comes back to Python as soon as the work is queued up" | covered |
| T3 he built a forward pass | Problem | "So you've built Llama from scratch" | covered |
| P1 Forward pass scene | Problem | "embed a token, you run it through thirty-two layers" | covered |
| P2 Predict question | Problem | "How many tokens per second does it generate?" | covered |
| P3 Answer 17; 16 GB / 273; wrong model GPU/attention | Problem | B: "Attention's the expensive part, right?"; A: "about seventeen... fifty-nine milliseconds" | covered |
| P4 ~100 trillion multiply-adds; 16 billion ops; thousands; idle >99% | Problem | "should be making... thousands of tokens per second" | covered |
| P5 gap thinking vs fed; more work per byte | Problem | "more useful work out of every byte you drag out of memory" | covered |
| O1 1995 Wulf and McKee note | Origin | "Hitting the Memory Wall: Implications of the Obvious" | covered |
| O2 60% vs 7% per year | Origin | "about sixty percent a year... about seven percent" | covered |
| O3 caches; decode is the case caches can't save | Origin | "decoding a language model is the case caches just can't save" | covered |
| O4 why chatbot speed; expensive memory | Origin | "inference companies pay for GPUs with really expensive memory" | covered |
| I1 chef and van | One token | "The van is everything" | covered |
| I2 decode step: 4,096, 32 layers, QKV-O, gate/up/down, 128,256 vocab | One token | "four thousand ninety-six numbers... hundred twenty-eight thousand, two hundred fifty-six" | covered |
| I3 matrix-vector multiply, each weight used once | One token | "That's called a matrix-vector multiply" | covered |
| I4 nowhere near 16 GB on chip; stream again | One token | "Because there's nowhere to put it" | covered |
| I5 the division 8.03B x 2 / 273 | One token | "Eight point oh three billion parameters, times two bytes" | covered |
| I6 memory bandwidth term; most important number | One token | "now the most important number about your machine" | covered |
| F1 Figure 001 described | One token | "On the left, a big box. Memory, a hundred twenty-eight gigabytes of LPDDR five X" | covered |
| I7 embedding lookup 525M, output read, ~15 GB, ~18 | One token | "real weight traffic is about fifteen gigabytes... more like eighteen" | covered |
| I8 never full bandwidth; ceiling not promise | One token | "seventeen is the line you hold your measurements up against" | covered |
| F2 step figure, 436 MB cells, bus solid, hairline math | Watch one step | "Each layer is about four hundred thirty-six megabytes" | covered |
| I9 batch 16/128: same bytes, 128 tokens per delivery | Watch one step | "It doesn't change at all... a hundred twenty-eight tokens out of one delivery" | covered |
| I10 arithmetic intensity | Intensity | "It's called arithmetic intensity" | covered |
| I11 FLOPs term | Intensity | "A FLOP is one floating-point operation" | covered |
| I12 1 FLOP per byte | Intensity | "two FLOPs over two bytes. One FLOP per byte" | covered |
| I13 458 needed | Intensity | "About four hundred fifty-eight FLOPs per byte" | covered |
| I14 ridge point, memory-bound, compute-bound | Intensity | "It's the machine's ridge point" | covered |
| I15 petaFLOP chain 1000-500-250-125 | Intensity | "a thousand trillion, down to five hundred... a hundred twenty-five" | covered |
| I16 2009 Williams, Waterman, Patterson | Roofline | "In two thousand nine, Samuel Williams" | covered |
| I17 axes, roof, slope, ridge | Roofline | "Across the top, a flat line. That's the compute roof" | covered |
| F3 calculator described | Roofline | "You pick a model, a weight precision, the hardware, and then two sliders" | covered |
| I18 batch 64: ~11 per stream, ~700 total | Roofline | "each user gets about eleven... total goes from seventeen to about seven hundred" | covered |
| I19 17/34/68 | Roofline | "seventeen, thirty-four, sixty-eight" | covered |
| I20 H100 ~209, 3.35 TB/s, Fireworks | Roofline | "about two hundred nine tokens a second" | covered |
| I21 128K context halves | Roofline | "your speed halves" | covered |
| I22 Qwen3 30B-A3B faster | Roofline | "it decodes faster than the eight B" | covered |
| I23 prefill term | Prefill | "That's called prefill" | covered |
| I24 matrix-matrix, reuse 1,000x, compute-bound | Prefill | "A thousand-token prompt reuses every weight a thousand times" | covered |
| I25 decode term; token 5 depends on 4 | Prefill | "Token five depends on token four" | covered |
| F4 Figure 004 described | Prefill | "On the left, prefill. A big square of weights, times a wide block" | covered |
| I26 TTFT term; 16 trillion FLOPs; 0.13 s; few times that | Prefill | "About sixteen trillion FLOPs... Point one three seconds" | covered |
| I27 1,000/17 = 59 s; the picture to keep | Prefill | "An eighth of a second, and about a minute" | covered |
| I28 KV cache term; read in full; grows | KV cache | "the cache gets read in full, every step" | covered |
| I29 formula, 131,072 bytes = 128 KiB | KV cache | "a hundred thirty-one thousand and seventy-two bytes" | covered |
| I30 GQA 32 query, 8 KV, 4x | KV cache | "That trick's called grouped-query attention" | covered |
| F5 1K/8K/32K/128K progression | KV cache | "At thirty-two thousand, about four point three gigabytes... about eight tokens a second" | covered |
| I31 8K costs ~6% | KV cache | "Eight thousand tokens of context costs you about six percent" | covered |
| I32 32 x 4K = 16 GiB; weights shared, KV not; flattens | KV cache | "Weights are shared across a batch. KV caches aren't." | covered |
| I33 attention decode memory-bound too | KV cache | "So attention in decode is memory-bound too" | covered |
| I34 one-line equation | Escape routes | "tokens per second is roughly your usable bandwidth divided by the bytes" | covered |
| F6 Figure 006 five levers + KV side + prefill side | Escape routes | "five branches coming down"; "a smaller set of tricks for the KV side" | covered |
| I35 quantization 34/68, 4.5-5 bits, Q4_K_M 4.9 GB ~55, math in 16-bit | Escape routes | "The math still happens in sixteen-bit or so" | covered |
| I36 MoE term, 30.5B/3.3B, 8 of 128, 6.7 GB, ~41, 61 GB, 24 GB card, batching catch | Escape routes | "All of it has to be in memory, about sixty-one gigabytes" | covered |
| I37 batching, cost 1/50, limits | Escape routes | "each token costs about a fiftieth as much" | covered |
| I38 speculative decoding, check 5 vs 1 | Escape routes | "Checking five tokens instead of one costs almost nothing extra" | covered |
| I39 HBM term, 3.35 TB/s, 12x, 209, Spark trade | Escape routes | "memory chips stacked vertically" | covered |
| I40 serving engines, FlashAttention | Escape routes | "serving engines, like V L L M, are just all of these at once" | covered |
| P6 predict sheet 110 / 32 / 55, shared embedding, 9 ms step | Predict the sheet | "each step only takes about nine milliseconds" | covered |
| B1 framing | Build It | "measure the two numbers that define your Spark's roofline" | covered |
| B2 t1 container, ARM64, playbooks | Build It | "NVIDIA publishes DGX Spark playbooks" | covered |
| B3 t2 bandwidth: 2x bytes, synchronize, go big, read-only sum | Build It | "So it's two times the buffer size" | covered |
| B4 t3 matmul 2n^3, sweep, plateau, ridge | Build It | "two times n cubed FLOPs" | covered |
| B5 t4 prediction function, file size | Build It | "use the file size on disk as the bytes per token" | covered |
| B6 t5 llama-bench pp/tg, vLLM, Hugging Face | Build It | "it reports the prefill speed and the decode speed separately" | covered |
| B7 t6 batched bench 1-64 | Build It | "go batch one, two, four, eight, sixteen, thirty-two, sixty-four" | covered |
| B8 done-when | Build It | "You're done when you've got a bandwidth sweep" | covered |
| M1 ceilings and machine numbers | Predict sheet / Intensity | ceilings said in Predict; "upper bound"; "four hundred fifty-eight" | covered |
| M2 below 273 normal; refresh, scheduling, turns | Measure | "refresh cycles, the memory periodically recharging itself" | covered |
| M3 60-85% of spec ceiling | Measure | "around sixty to eighty-five percent" | covered |
| M4 gap reasons (4) | Measure | "A few honest places" | covered |
| M5 batch curve shape, hundreds total | Measure | "Batch two gives you nearly double. Then it bends" | covered |
| K1 tiny buffers | Break It | "an eight megabyte buffer, and believe what it says" | covered |
| K2 forget synchronize | Break It | "Did they forget to wait" | covered |
| K3 count bytes once, 150% | Break It | "a hundred fifty percent of the ceiling" | covered |
| K4 heavy cache, 4.3 GB on 16 vs 4.9; KV quantization caveat | Break It | "Four point three on top of four point nine" | covered |
| E1 why bandwidth not compute | Problem, One token, close | B's restatement; "streaming every weight through the GPU once" | covered |
| E2 2x FLOPs | Intensity | "Double them and you've doubled the idle capacity" | covered |
| E3 70B 4-bit: 35 GB ~8, 40-43 GB 6-7, measured 4-6, fits | Predict the sheet | "Call it four to six tokens a second" | covered |
| E4 batching scale: 1/B, ridge, KV, capacity wall | Escape routes | "And there's a third, kind of a quieter wall. Memory capacity" | covered |
| E5 prefill vs decode; different hardware and tricks | Prefill | "make time to first token and tokens per second better with completely different hardware" | covered |
| E6 MoE bytes read vs stored | Escape routes | "Speed depends on the bytes you read per token, not the bytes you store" | covered |
| G1 Horace He; kipply | Close | "Making Deep Learning Go Brrrr From First Principles" | covered |
| C1 next lesson Fireworks baseline | Close | "benchmarking it against Fireworks" | covered |

Numbers check: every lesson number in the script matches the lesson. Derived from figure code, not
lesson prose: about a millisecond and a half per layer to arrive, a few microseconds of math per
layer, about fifty-five milliseconds per step (figure label). Derived in Break It: 32K cache on bf16
weights is about a quarter more bytes, about a fifth slower; on Q4_K_M it nearly doubles the bytes.
Not covered by design: the calculator's Mac M4 Max and RTX 4090 buttons (in the figure, not the prose).
