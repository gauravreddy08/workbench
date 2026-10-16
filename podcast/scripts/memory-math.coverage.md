# Coverage: memory-math

Lesson src/lessons/memory-math.mdx vs podcast/scripts/memory-math.md. Item IDs match
podcast/outlines/memory-math.md. "Fixed" = missing or weak in the first draft, added in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs re-explained (KV cache, GQA, unified memory, page cache, OOM killer, decode reads everything) | Problem; Origin; Spark | "every layer keeps the key and value vectors for every token"; "file data the kernel keeps in memory"; "picks a process and kills it" | covered |
| P1 diagnostic question, 8 GB wrong answer | Problem | "Eight gigs. Eight billion parameters, a byte each" | covered |
| P2 vLLM 24x at 32K on Spark | Problem | "maximum concurrency for thirty-two thousand seven hundred sixty-eight tokens per request: twenty-four x" | covered |
| P3 70B 4-bit 128K 2x; notebook killed | Problem | "it says something like two x... something gets killed" | covered |
| P4 arithmetic faster than vLLM boots | Problem | "faster than V L L M boots" | covered |
| PR1 predict 8B one user / users at 32K | Problem: first prediction | "about seventeen to eighteen gigs"; "About twenty-five users" | covered |
| O1-O4 Shazeer 2019, MQA, GQA 2023, Llama 2 70B / Llama 3, 4x discount | Origin | "Twenty nineteen. Noam Shazeer"; "Llama two's seventy B model adopted it" | covered |
| B1 kitchen comparison | Four buckets | "equipment bolted to the floor" | covered |
| B2-B5 four buckets | Four buckets | "Bucket one, the weights... bucket four, overhead" | covered |
| F1 Figure 001 bar | Four buckets | "a dashed sliver for the O S... about ninety-three gigs, is just free" | covered |
| B6 the equation | Four buckets | "Users that fit equals what's left after you subtract" | covered |
| U1-U2 GB vs GiB, 16.06 / 14.96, 7%, 128 KiB x 8,192 = 1 GiB | GB vs GiB | "about seven percent bigger"; "exactly one gig, no rounding" | covered |
| C1 config numbers | Counting | "the vocabulary is a hundred twenty-eight thousand two hundred fifty-six" | covered |
| C2 embedding 525M | Counting | "five hundred twenty-five million parameters" | covered |
| C3 attention per layer, GQA term | Counting | "only eight key value heads, not thirty-two"; "group of four query heads" | covered |
| C4 SwiGLU, MLP 176M, 4x attention | Counting | "swi-glue... A hundred seventy-six million per layer" | covered |
| C5 RMSNorm, 8,192 per layer, final 4,096 | Counting | "eight thousand one hundred ninety-two per layer. And one more norm" | covered |
| C6 tied head flag, 1B true, worth 1 GB | Counting | "That one flag is worth five hundred twenty-five million parameters" | covered |
| F2 Figure 002 | Counting | "three long bars... two stubby little bars" | covered |
| C7 sum to 8,030,261,248 | Counting | "eight billion, thirty million, two hundred sixty-one thousand, two hundred forty-eight" | covered |
| C8 meta device check, 1B and 70B counts | Counting | "PyTorch's meta device... seventy point five five billion" | covered |
| C9 70 / 17 / 13 percent | Counting | "The MLP is seventy percent of the model" | covered |
| C10 interview shortcut | Counting | "two and a half times the hidden size squared" | covered |
| PR2 Qwen2.5 7B, 7,615,616,512, biases 129,024 | Qwen prediction | "seven billion, six hundred fifteen million"; "A hundred twenty-nine thousand and twenty-four" | covered |
| Q1-Q3 FP32, BF16 (pointer), FP8 9.1 GB | Bytes per parameter | "about nine point one gigabytes, not eight" | covered |
| Q4 block scales, never 4.0 bits | Bytes per parameter | B: "four-bit is just... a quarter"; "never four point oh bits" | covered |
| Q5 GGUF, Q8_0 8.5 bits | Bytes per parameter | "thirty-four bytes for thirty-two weights" | covered |
| F3 Figure 003 ladder | Bytes per parameter | "it's a staircase going down" | covered |
| Q6 AWQ 4.16 bits, 5.7 GB | Bytes per parameter | "twenty extra bits for every hundred twenty-eight weights" | covered |
| Q7 Q4_K_M 256 / 8 x 32, 4.5, 4.8-4.9, 4.9 GB | Bytes per parameter | "Super-blocks of two hundred fifty-six weights" | covered |
| Q8 file size = weight memory | Bytes per parameter | "the file size on disk is a very good estimate" | covered |
| K1 formula, 131,072 B | KV cache | "a hundred thirty-one thousand and seventy-two bytes" | covered |
| K2 why each factor, queries not stored, 4x | KV cache | "Queries are recomputed from the current token every step" | covered |
| K3 table across models | KV cache | "Thirty-two K per token... Three hundred twenty K per token"; "Two and a half gigs for one request" | covered (rows picked, not read) |
| K4 three observations + linear scaling | KV cache | "The cache alone would fill an H one hundred"; "Double the context, the cache doubles" | fixed (linear line added) |
| K5 FP8 cache halves | KV cache | "every one of those numbers halves" | covered |
| K6 context = prompt + generated, paged attention | KV cache | "The prompt plus everything generated" | covered |
| PR3 70B Q4 ten users 32K | Seventy B prediction | "About a hundred fifty-two"; "an F P eight cache. Five gigs per user" | covered |
| A1-A3 activations, decode 120 KB, prefill 0.7 / 1 GB, peak | Activations | "about a hundred twenty kilobytes per token"; "it's the peak that has to fit" | covered |
| A4 logits every position 8.4 GB, logits_to_keep | Activations | "about eight point four gigabytes of scores" | covered |
| A5 naive attention 16 GiB per layer | Activations | "that grid is sixteen gigs. For one layer" | covered |
| A6 engines chunk, max_num_batched_tokens | Activations | "That setting's called max num batched tokens" | covered |
| V1-V2 CUDA context | Overhead | "the CUDA context... belongs to the driver" | covered |
| V3 caching allocator, allocated vs reserved | Overhead | "Memory allocated... And memory reserved" | covered |
| V4 fragmentation, DynamicCache cat | Overhead | "ten free holes of a hundred megabytes each" | covered |
| V5 Mac MPS 256 / 1,024 MiB | Overhead | "two hundred fifty-six mebibyte tensor... a thousand twenty-four" | covered |
| V6 everything else, 1-3 GiB | Overhead | "budget about one to three gigs" | covered |
| F4 Figure 004 one request | Overhead | "Reserved never comes down on its own" | covered |
| S1-S3 Spark one pool, failure mode | Spark | "its hundred twenty-eight gigs is one pool"; "O O M killer" | covered |
| S4 measuring: nvidia-smi, free, MemAvailable, mem_get_info | Spark | "can read \"Not Supported\""; "MemAvailable in proc meminfo" | covered |
| E1-E2 up-front allocation, four steps | Serving engines | "it's the opposite of waste, it's a plan" | covered |
| F5 Figure 005 H100 vs Spark | Serving engines | "about fifty-four gigs, which is about four hundred forty thousand tokens"; "about thirteen gigs" | covered |
| E3 24x explained, whole computer, playbooks, bytes option | Serving engines | "Ninety-eight divided by four gigs... Twenty-four" | covered |
| G1-G7 interactive tour + speed | Putting it together | "About a hundred users and about sixty-two"; "about point four five seconds per step" | covered |
| BI0-BI7 Build It t1-t6, done when | Build It | "sixteen billion, sixty million, five hundred twenty-two thousand"; "nine thousand two hundred sixteen short"; "run each trial in its own subprocess" | covered |
| M1-M6 Measure | Measure | "the most boring number you measure"; "plus an eighth of a gig at one K" | covered |
| X1-X4 Break It | Break It | "ask for every logit"; "textbook attention"; "run two at once"; "fragment the pool" | covered |
| E-1 one user 17-18 GiB | Prediction; Close | "about seventeen to eighteen gigs"; "Fifteen down to five" | covered |
| E-2 count recipe | Qwen prediction | "So the recipe, if someone hands you a config" | covered |
| E-3 scaling, which bites first, bandwidth wall | KV cache; Close | "users times context"; "the room gets slow before it gets full" | covered |
| E-4 why vLLM grabs 90% | Serving engines | "the opposite of waste" | covered |
| E-5 alloc 15 vs system 17 | Explain It Back | "Walk down the layers" | covered |
| D1 Go Deeper | Explain It Back | "kipply's \"Transformer Inference Arithmetic\"" | covered |
| N1 Connections | Explain It Back | "the quantization lesson is the other side of the weights" | fixed |

Numbers check: all lesson numbers reproduced as written. Derived (not stated in the lesson): 98 GiB / 4 GiB
= 24.5 -> 24 (ties the pool in Figure 005 to the 24x log line); "half a meg per token" with 32 KV heads
(4 x 128 KiB); B's wrong intermediate "a hundred thirteen, divided by four, twenty-eight".
