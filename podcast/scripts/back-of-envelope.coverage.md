# Coverage: back-of-envelope

Lesson src/lessons/back-of-envelope.mdx vs podcast/scripts/back-of-envelope.md. Item IDs match
podcast/outlines/back-of-envelope.md. No item is MISSING. Numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs re-explained where used | Step 2; Example 1; Example 3 | "That's Little's law, from the waiting-versus-working lesson"; "For L L M decoding, yes"; "Quick refresher, because this one matters here" | covered |
| P1 interview scene, ranker, NDCG, "how does it scale" | Problem | "the interviewer leans back and says, Nice. So how does it scale?" | covered |
| P2 cross-encoder term | Problem | "reads the query and one document together, in one pass" | covered |
| P3 blank / horizontal scaling vibe | Problem | B: "it scales horizontally... add more GPUs"; "Scale to what? More users?" | covered |
| P4 ninety-second strong answer, all numbers | Problem | "Say ten million queries a day... candidates multiply everything" | covered |
| P5 not clever; method and stock of numbers | Problem | "They have a method, and they have a stock of numbers" | covered |
| O1 Trinity 1945, 16 km, 2.5 m, 10,000 vs 20,000 tons | Origin | "about sixteen kilometers away... off by a factor of two" | covered |
| O2 piano tuners, Fermi problems | Origin | "how many piano tuners are there in Chicago?" | covered |
| O3 Bentley 1980s column; Dean 2009 slide; Fermi problem with a server | Origin | "It's a Fermi problem with a server in it" | covered |
| S0 precise meaning | What scale means | "which resource runs out first, at what load" | covered |
| S0b resources list, pipe | What scale means | "Your system is like a pipe that runs through all of those" | covered |
| S0c bottleneck term | What scale means | "making anything else faster does nothing" | covered |
| S0d job: name, number, change | What scale means | "name the bottleneck, put a number on where it hits" | covered |
| F1 five steps, loop; steps 1 and 3 skipped, 5 wanted | What scale means | "Multiply the load by ten and go around again"; "steps one and three are where most people skip" | covered |
| C1 ask or state | Step 1 | "What they hate is neither happening" | covered |
| C2 QPS; per day vs per second | Step 1 | "machines fail per second, so you convert" | covered |
| C3 peak factor 2-3x / 10x; never average | Step 1 | B: "Over a day it all evens out" -> "You never size for the average" | covered |
| C4 read:write examples and consequences | Step 1 | "A chat product writes every message, and then reads the whole conversation back" | covered |
| C5 size; 256 tokens not one ID | Step 1 | "a document for the ranker is two hundred fifty-six tokens of text, not one ID" | covered |
| C6 growth 2x/yr = 10x in ~3 yr | Step 1 | "ten times bigger in a bit over three years" | covered |
| R1 resource list with units and failure mode; money | Step 2 | "When someone in finance notices" | covered |
| R2 FLOP term, 10^14-10^15 | Step 2 | "a hundred trillion to a thousand trillion a second" | covered |
| R3 2N forward, 6N training | Step 2 | "two flops per parameter, per token... Training costs about six" | covered |
| S2b compute vs memory bound, 25,600 tokens share reads, prefill | Step 2 | B: "I thought these models were memory-bound"; "twenty-five thousand six hundred tokens, all sharing every weight" | covered |
| A1 powers-of-ten method, 3x10^2 x 2.5x10^4 | Step 3 | "three hundred times twenty-five thousand... Eight million" | covered |
| A2 order of magnitude term | Step 3 | "Three hundred and seven hundred are both hundreds" | covered |
| A3 conversions (day, month, year, 2^10, 730 h, doubling) | Step 3 | "a million a day is about ten a second. Really it's eleven point six" | covered |
| A4 ~15% under; borderline, measure | Step 3 | "It underestimates by about fifteen percent" | covered |
| PR1 predict 50M/day -> 1,500; exact 1,736; 14% | Step 3 | "about seventeen hundred thirty-six. So you were fourteen percent low" | covered |
| M1 capacity stock (all rows) | Step 4 | "pure Python, about ten million"; "Bits. Divide by eight"; "two cents per gigabyte per month" | covered |
| M2 MFU, 30-50%, use 40% | Step 4 | "That fraction has a name, M F U" | covered |
| M3 headroom 60-70%, spare | Step 4 | B: "I buy five" -> "You never run a machine at a hundred percent" | covered |
| B1 biggest ratio; what breaks next; 10x add, 100x redesign | Step 5 | "you say what breaks next, once you've fixed it" | covered |
| W1a assumptions; 86M outside embeddings | Example 1 | "only about eighty-six million of those are outside the embedding table" | covered |
| F2 chain figure; levers; chain over final number | Example 1 | "think of this as a chain of boxes"; "Every number in it is a lever" | covered |
| W1b tokens ~8x10^6 -> 10^7; 243-token test | Example 1 | "came out at two hundred forty-three tokens" | covered |
| W1c FLOPs incl. attention 4 x 12 x 768 x 256 | Example 1 | "four times twelve layers times seven hundred sixty-eight wide" | covered |
| W1d 5 H100, 8 with headroom; Spark 8x lower (FP4-derived), 40 Sparks | Example 1 | "derived from NVIDIA's F P four marketing number" | covered |
| W1e memory: 220 MB, half GB activations, Little's law 30 in flight, 15-20 GB | Example 1 | "Three hundred a second, times a tenth of a second each, is thirty" | covered |
| W1f network 100 KB, 30 MB/s, 0.25 Gbit/s | Example 1 | "about a quarter of a gigabit" | covered |
| W1g latency 5x10^12, 13 ms H100, 100 ms Spark; Sparks don't speed one query | Example 1 | B: "I'd just add more Sparks" -> "It doesn't make any one query faster" | covered |
| W1h compute by ~100x | Example 1 | "by a factor of about a hundred over everything else" | covered |
| W1i 10x: 50 H100, $100k+, levers 5x/2x/2-8x, cache, Zipf | Example 1 | "The tenth most popular query gets searched about a tenth as often" | covered |
| W1j 100x: 500 H100, $1M/month, cascade etc. | Example 1 | "Nobody runs a full cross-encoder over a hundred candidates" | covered |
| PR2 CPU box predict: 15x short, 5 s, MiniLM + 50 = 16x, 0.3 s | Predict CPU | B: "A CPU should be fine with one a second" -> "It's fifteen times short at peak" | covered |
| F3 calculator controls, bars, outputs, "it depends" | Calculator | "that reordering is what it depends actually means" | covered |
| F3a H100 8x fewer nodes | Calculator | "Same bottleneck, about eight times fewer nodes" | covered |
| F3b 1k/day bored | Calculator | "One box, and it's bored" | covered |
| F3c MiniLM 10/64 on H100; GPU 15% util | Calculator | "A G P U sitting at fifteen percent utilization" | covered |
| F3d Qwen 1024 on Spark goes red | Calculator | "look at one query, alone. It goes red" | covered |
| F3e CPU box slide up | Calculator | "watch where it stops being enough" | covered |
| E1 billion pages question, 768 dims | Example 2 | "very TinyFish-shaped" | covered |
| E2 five formats and totals | Example 2 | "In float thirty-two... sixty-four gigabytes" | covered |
| E3 quantization, product quantization terms | Example 2 | B: "how do you get three kilobytes down to sixty-four bytes?" | covered |
| F4 log bars vs Spark RAM, 1 TB box, 8 TB SSD | Example 2 | "three vertical lines. The Spark's RAM..." | covered |
| E4 SSD vs RAM; chunking 4x, 6 TB; HNSW 128 B, a sixth | Example 2 | "Thirty-two neighbours, four bytes per link" | covered |
| E5 brute force 0.5 s/query; ANN term | Example 2 | B: "throw it on a GPU" -> "half a second per query" | covered |
| E6 compute 4x10^20, 280 GPU-hours, < $1,000, Spark 90 days | Example 2 | "about two hundred eighty GPU-hours" | covered |
| E7 crawl 10^4/s, 10,000 in flight, 1 GB/s, concurrency | Example 2 | B: "that's a bandwidth problem" -> "So it's a concurrency problem" | covered |
| E8 breaks first, 10x, 100x, shard term | Example 2 | "the cost of asking every one of them, per query, becomes the next wall" | covered |
| K1 users hold GPU while generating; Little's law 150; KV cache term | Example 3 | B: "if we have a hundred thousand people signed in" -> "a hundred fifty responses generating" | covered |
| K2 128 KiB/token, 512 MiB, 80 GB + 16 GB | Example 3 | "a hundred twenty-eight kilobytes per token" | covered |
| F5 two devices, two walls | Example 3 | "Picture two rows. One for the Spark, one for the H one hundred" | covered |
| K3 H100 119, 24 ms, 40 tok/s, 594 by bandwidth, 2 GPUs (3 with headroom) | Example 3 | "almost six hundred users"; "three with headroom" | covered |
| K4 Spark 208 vs 21, 27 GB, 8 Sparks | Example 3 | "Twenty-one. Even though two hundred fit." | covered |
| PR3 10x: 800 GB, 13 H100; fp8, shorter context, prefixes, fewer KV heads; not faster GPU | Example 3 | B: "just get a faster GPU" -> "A faster GPU with the same eighty gigabytes holds exactly the same number" | covered |
| I1 narrate, practise until boring | Interview script | "You practise it until it's boring" | covered |
| I2 eight steps | Interview script | "First, restate and scope... And eighth, say how you'd check it" | covered |
| I3 step 8 skipped; engineer not calculator; hypotheses | Interview script | "makes you sound like an engineer instead of a calculator" | covered |
| BT0 setup, stand-ins, GPU check, journal | Build It | "And then you start a journal" | covered |
| BT1 paper estimates at three loads, 125 x 40%, 2x check | Build It | "a hundred twenty-five trillion flops a second times forty percent" | covered |
| BT2 matmul ceiling (2 n cubed, sync), model sweep, MFU, M4 calibration | Build It | "Multiplying two n by n matrices costs two times n cubed flops"; "about a hundred fifty milliseconds" | covered |
| BT3 tiny server, one lock, backlog, GPU util | Build It | "One model and one lock, so requests take turns" | covered |
| BT4 open loop, coordinated omission, scheduled time, rate steps, Mac vs Spark, review | Build It | B: "Send a request, wait for the answer" -> "It's called a closed loop, and it lies" | covered |
| BT5 close loop questions; three new estimates | Build It | "tokens times six N divided by your measured flops" | covered |
| DW done-when list | Build It | "You're done when the journal has the three paper estimates" | covered |
| MS1 ceiling under spec; 70-80% | Measure | "rarely sustain more than seventy to eighty percent" | covered |
| MS2 predicted table values incl. p99 < 300 ms row | Measure | "achieved flops of fifty trillion at a hundred pairs"; "under three hundred milliseconds" | covered |
| MS3 MFU vs model size and batch, width 384, overhead | Measure | B: "Why does small make it worse?" | covered |
| MS4 knee, 70-80%, Little's law check < 1 | Measure | "With one GPU lock, that should be under one" | covered |
| MS5 ratio within 2x / 5x; culprits | Measure | "The usual suspects are M F U way below forty percent" | covered |
| BK1 size for average burst | Break It | "Systems sized for the average don't fail on average days" | covered |
| BK2 long document, padding, fixes | Break It | "Batches are padded to their longest member" | covered |
| BK3 starve GPU, CPU pinned, fixes | Break It | "The fix isn't a bigger GPU" | covered |
| BK4 five errors | Break It | B works through four; A: "Replication is part of the estimate" | covered |
| X1 ninety-second answer | Problem; Interview script; close | P4 plus steps; close restatement | covered |
| X2 compute vs memory bound, how scaling differs | Step 2 | "you count flops and you buy compute... you count bytes per step, you batch more users" | covered |
| X3 billion pages model answer | Example 2 | "Still one or two SSDs. But a dozen machines' worth of RAM" | covered |
| X4 chat model answer | Example 3 | as K1-K4, PR3 | covered |
| X5 billion users -> rate, 20%, 5/day, 10^4/s, 3x10^4 | A billion users | "A billion users is not a billion requests a second" | covered |
| G1 sources | Close | "Jon Bentley's Back of the Envelope column... Simon Eskildsen's Napkin Math" | covered |
| CN1 connections | Close | "Load balancing is what you need once eight H one hundreds turns into eight actual servers" | covered (vector search pointed to in Example 2; memory-math lesson not named) |

Numbers derived in the script that are not written in the lesson:
- Spark vs H100 bandwidth "about a twelfth" (273 GB/s vs 3.35 TB/s) and spec compute "roughly a tenth".
- "if a query takes a hundred milliseconds, the max is ten a second" (illustration of 1 / one-query time).
- B's "fifteen hundred times half a gig is seven hundred fifty, call it eight hundred" (lesson: 1,500 x 0.54 GB ~ 800 GB).
