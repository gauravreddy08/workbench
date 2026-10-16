# Coverage: context-management

Lesson src/lessons/context-management.mdx vs podcast/scripts/context-management.md. Item IDs match
podcast/outlines/context-management.md. No item was MISSING after the draft; numbers checked against
the lesson. "Derived" marks a number said aloud that the lesson does not state.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs re-explained | Desk; Prompt caching | "That's the K V cache. The model keeps them so it doesn't have to recompute"; "Quick recap: if a server has already computed" | covered |
| T2 $5-15 estimate | Build It: benchmark | "somewhere around five to fifteen dollars... not a receipt" | covered |
| P1 instinct, AST walking | Problem | "have it walk the syntax tree instead of dumping whole files" | covered |
| P2 step 3 config 2350, step 9 12K log E4127, step 38 | Problem | "timeout M S, set to two thousand three hundred fifty"; "E four one two seven, upstream closed" | covered |
| P3 runs out of room, guesses 3000 | Problem | "it just guesses. Three thousand." | covered |
| P4 all there at 8K and 31K of 90K, wrong timeout | Problem | B: "If it's in the window, the model can see it"; "a dozen other timeout M S lines" | covered |
| P5 bill: 90K at step 38, 2M for ~5K | Problem | "about two million input tokens... maybe five thousand" | covered |
| P6 not dumb, measurable, numbers in a table | Problem | "turn it into numbers in a table" | covered |
| O1 512 / 1,024 / 2,048 | Origin | "five hundred twelve tokens. GPT two had one thousand twenty-four" | covered |
| O2 RAG 2020 Lewis, Facebook AI | Origin | "in twenty twenty, Patrick Lewis and his colleagues at Facebook AI" | covered |
| O3 100K May 2023, GPT-4 Turbo 128K Nov, Gemini 1.5 1M Feb 2024; "retrieval over" | Origin | "Anthropic shipped a hundred thousand tokens in May twenty twenty-three" | covered |
| O4 Liu July 2023 Stanford | Origin | "In July, Nelson Liu and colleagues at Stanford" | covered |
| O5 Kamradt Nov 2023 | Origin | "in November, Greg Kamradt hid a single sentence" | covered |
| O6 context engineering definition, Anthropic quote | Origin | "Context is a finite resource with diminishing returns" | covered |
| I1 desk analogy | Desk | "a researcher at a small desk, with a whole library behind her" | covered |
| I2 window, tokens (~4 chars, 3/4 word), harness, reads everything | Desk | "a token's about four characters, or three quarters of a word" | covered |
| I3 four bills | Desk | "there are four separate bills" | covered |
| I4 128 KiB/token, 12.2 GiB per 100K, 16 GB weights, price and rate limits | Desk | "about twelve point two gigabytes of K V cache"; "the price, and the rate limits" (derived: per-token breakdown 32 x 2 x 1,024 x 2 bytes) | covered |
| I5 $3/$15, 30 cents per call | Desk | "thirty cents. Per call." | covered |
| I6 prefill, 2 FLOPs/param, 30K crossover, 0.15/1.5/8/60+ s at 100 TFLOP/s | Desk | "Around position thirty thousand"; "fifteen hundredths of a second... over a minute" (derived: "about half a million operations" per earlier token) | covered |
| I7 attention as fourth bill | Desk | "The fourth bill doesn't show up on any invoice" | covered |
| F1 figure 001 stack, breakpoint, tool results 80%+ | What's on the desk | "Draw it as a stack... Often eighty percent or more" | covered |
| I8 system prompt rounding error; tool results | What's on the desk | "A rounding error" | covered |
| I9 stateless, resend | Loop | B: "I always kind of pictured the API holding onto the conversation" | covered |
| I10 minimal loop in words | Loop | "You keep a list of messages, starting with the task" | covered |
| I11 step k ~ k times | Loop | "step k sends about k times that many" | covered |
| PR1 120 steps: 6.7M, $20, 110K final, triangle, quadratic, $2.40 cached | Loop | "call it six point seven million input tokens. About twenty dollars"; "about two dollars forty" | covered |
| F2 figure 002 bars 3K/5K/8K/11K, area of triangle | Loop | "Step one, about three thousand billed. Step two, five thousand" | covered |
| I12 prompt caching definition | Prompt caching | "APIs sell this as prompt caching" | covered |
| I13 breakpoint, 1.25x / 0.1x, 5 min refresh, OpenAI ~1,024 auto | Prompt caching | "Default lifetime's five minutes"; "OpenAI does it automatically" | covered |
| I14 agent loop perfect customer | Prompt caching | "The perfect customer" | covered |
| I15 order rule | Prompt caching | "Anything that changes goes as late in the prompt as possible" | covered |
| I16 timestamp, Python set | Prompt caching | "looping over a Python set" | covered |
| I17 editing history breaks cache, 1.25x, fewer tokens can cost more | Prompt caching | B: "Fewer tokens has to be cheaper"; "sometimes fewer tokens costs more money" | covered |
| I18 softmax, fixed budget | Attention dilution | "Attention is a fixed budget" | covered |
| I19 logit, e ~2.7, 2% / 0.2% / 0.02%, leads 6.9/9.2/11.5, +2.3 per 10x, Python | Attention dilution | "about two percent"; "eleven and a half"; "I ran those numbers in Python" (derived: e cubed "about twenty times") | covered |
| I20 real models better; near-misses | Attention dilution | B: "Real models aren't that dumb though" | covered |
| I21 attention dilution term, failure two | Attention dilution | "So that's attention dilution" | covered |
| I22 Liu setup, U | Lost in the middle | "twenty retrieved documents... accuracy traced a U" | covered |
| I23 GPT-3.5 below closed book; from memory | Lost in the middle | "Worse than nothing"; "going from memory on the exact numbers" | covered |
| F3 figure 003 U, primacy/recency, closed-book line, newer models | Lost in the middle | "starts high on the left, that's called primacy" | covered |
| I24 why a U: data, first tokens, RoPE | Lost in the middle | "position encodings like the RoPE you implemented" | covered |
| I25 rules: question at end, important at edges, fewer docs | Lost in the middle | "fewer, more relevant documents beat more documents" | covered |
| I26 Kamradt test, Paul Graham, sandwich sentence, heat map | Needle | "eat a sandwich and sit in Dolores Park" | covered |
| I27 Claude 2.1 27% -> 98% | Needle | "from twenty-seven percent to ninety-eight" | covered |
| I28 near-perfect now, doesn't mean solved | Needle | B: "So that one's solved." | covered |
| I29 lexical match, NoLiMa 2025 | Needle | "One's called No Lima, from twenty twenty-five" | covered |
| I30 RULER 2024, effective context length | Needle | "the effective context length, meaning the longest input" | covered |
| I31 Chroma Context Rot 2025 | Needle | "\"Context Rot\"" | covered |
| I32 ceiling / smoke test / your task | Needle | "treat the window size as a ceiling and the needle score as a smoke test" | covered |
| I33 one question; none free | Toolbox | "none of them is free" | covered |
| I34 stuff/preload | Toolbox | "The simplest is stuff everything. Preload." | covered |
| I35 RAG, chunking, BM25, embeddings, reranker, multi-hop | Toolbox | "B M twenty-five"; B: "A cross-encoder. That's literally what I'm training." | covered |
| I36 just-in-time loading, Claude Code no index | Toolbox | "Claude Code navigates repos this way, with no vector index" | covered |
| I37 truncation 2,000, head+tail, marker, clearing, context editing, batch | Toolbox | "Anthropic's API calls that context editing" | covered |
| I38 compaction, loses specifics, prompt what survives, fails silently | Toolbox | "fails silently" | covered |
| I39 memory files, Claude.md, MemGPT RAM/disk | Toolbox | "It's virtual memory, but for text" | covered |
| I40 sub-agents, 50K -> 1K, ~15x, independent tasks | Toolbox | B: "Oh, so that's how you save tokens." A: "the opposite" | covered |
| F5 figure 005 ~8K main, ~50K each, ~1K reports | Toolbox | "about eight thousand tokens, holding three short reports" | covered |
| F4a simulator setup, controls | Watching the window fill | "A toy coding task, thirty steps" | covered |
| F4b stuff 64K dies at 9; 128K ~$1, ~2.2M tokens, $6.70 off; partners | Watching | "about two point two million. Turn the cache off, about six dollars seventy" | covered |
| F4c truncate 64K loses both, cache hit rate | Watching | "every time it drops something, it's changing the start" | covered |
| F4d summarize 64K, config survives, log line doesn't | Watching | "The little config fact survives" | covered |
| F4e sub-agent under 7K, cheapest, cache less, five reports | Watching | "under seven thousand tokens... five little reports" | covered |
| F4f truncate = summarize at 128K | Watching | B: "They're... the same?" | covered |
| PR2 predict ranking and answer | Predict which wins | "Ninety-four thousand times thirty calls is about two point nine million" | covered |
| I41 harness job description, measuring skipped | Context engineering | "It's the one everyone skips" | covered |
| B0 benchmark design, any API, Spark local, small model | Build It: benchmark | "V L L M or the llama dot C P P server" | covered |
| B1 setup, generator, 374,799 chars, ~93,699 tokens, tiktoken 4.0, 150 files ~140K | Build It: benchmark | "about three hundred seventy-five thousand characters... about ninety-four thousand tokens" | covered |
| B2 ledger fields, budget $5, $1/$5, uncached input, cache marking, sanity check | Build It: ledger | B: "input tokens is just... how big the prompt was"; "about five thousand tokens of cache write" | covered |
| B3 grep/read, cap ~2,000, marker, error strings, line numbers, near-miss grep | Build It: tools | "lines sixty-one to three forty omitted" | covered |
| B4 loop, 8 tool calls, a/b/c, whole-question drop, 80%, two thirds, hints | Build It: loop | "The API rejects a tool result whose tool call is missing" | covered |
| B5 3 seeds, 9 sessions, report columns, 60 files fallback, agent review | Build It: matrix | "nine sessions of thirty questions" | covered |
| B6 needle grid, 165 calls, 4.6M, $4.60, <$3, non-literal | Build It: lost in the middle | "A hundred sixty-five calls... about four sixty" | covered |
| B7 stretch sub-agent strategy, predict recall | Build It: stretch | B: "So recall should be... decent?" | covered |
| B8 done-when items | Build It: stretch | "matches your provider's usage dashboard within a few percent" | covered |
| M1 predictions not measured | Measure | "I haven't run the API experiments" | covered |
| M2 stuff 2.9M, >90% cache, first slowest, two-hop interesting | Measure | "you just measured attention dilution from near-misses" | covered |
| M3 sliding window, plot vs questions back | Measure | "against how many questions back it was referring to" | covered |
| M4 summary recovers recall, cost bumps | Measure | "Expect a cost bump at every compaction" | covered |
| M5 latency: retrieval slower per question | Measure | "Just-in-time loading trades latency for tokens" | covered |
| M6 needle grid expectations, ~30K crossover, Spark TTFT | Measure | "the crossover was around thirty thousand tokens" | covered |
| M7 cost per correct answer, 30% / 20% | Measure | "thirty percent cheaper and twenty percent less accurate" (derived in B's line: "seventy cents... eight in ten... barely cheaper") | covered |
| K1 time at top, ~9x, move to last message | Break It | "roughly nine times" | covered |
| K2 no truncation, 400,000-line file | Break It | "four hundred thousand lines of the same assignment" | covered |
| K3 100-word summarizer | Break It | "It doesn't fail loudly. It just forgets." | covered |
| K4 poison 30 deprecated files | Break It | "Add thirty files that define timeout M S" | covered |
| E1 quadratic + two fixes + compaction rarely | Loop, Caching, Toolbox, Close | "cost grow with the square of the steps"; "every compaction costs a full-price re-read" | covered |
| E2 needle 100% at 1M: tells / doesn't | Needle | "if a vendor tells you their model scores a hundred percent" | covered |
| E3 lost in the middle + reranker earns keep | Lost in the middle; Toolbox | "often the biggest single win in the whole pipeline" | covered |
| E4 stuff vs retrieve, 100K -> 10M | Measure: stuff or retrieve | "say from a hundred thousand tokens to ten million" | covered |
| E5 scale: 12 TiB, 640 GB, few dozen per node, evict/offload, prefill second | Explain It Back: scale | "about twelve terabytes of K V cache" | covered |
| G1 Liu + Anthropic post | Go Deeper | "\"Effective context engineering for AI agents\"" | covered |
| C1 long-horizon, agent harness, reranker | Go Deeper and Connections | "what makes a task long-horizon" | covered |
