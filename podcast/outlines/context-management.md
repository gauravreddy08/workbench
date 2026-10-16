# Outline: context-management

Source: src/lessons/context-management.mdx. Curriculum entry: "Managing context." Question: what
should go into a model's context window, and what happens when it fills up? Why: he does this well by
instinct; this makes it measurable (compaction, retrieval, memory).

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: KV cache (each token costs memory), prefix caching (shared prompt start is cheap), memory math. -> Not listed; each re-explained in one or two sentences where it first comes up (KV cache under Memory, prefix caching under Prompt caching).
- T2 API spend roughly $5-15 for everything with a small model and the budget guard; an estimate. -> A, at the start of Build It.

## The Problem

- P1 He already does this by instinct: AST walking instead of dumping files, trimming each call. -> A opens on this.
- P2 Scene: agent 40 steps into a refactor; step 3 read settings.py, TIMEOUT_MS = 2350; step 9 a 12,000-token log with one line that mattered, "E4127 upstream closed"; step 38 needs both. -> A, as a story.
- P3 Failure 1: runs out of room; API error or harness silently cuts oldest messages; config goes; re-reads (more tokens) or guesses 3000. -> A; B reacts to "guesses".
- P4 Failure 2: all still there at token 8,000 and 31,000 of 90,000; uses wrong timeout because a dozen other TIMEOUT_MS lines are in there. -> B voices the wrong model "if it's in there the model sees it"; A says that's failure two.
- P5 Failure 3: works, bill is strange; each step resends the whole history; step 38 alone 90,000 input tokens; run 2 million input tokens for maybe 5,000 of interesting content. -> A.
- P6 None is the model being dumb; follows from how the window works; each measurable; goal: instinct into numbers in a table. -> A.

## Origin

- O1 Transformer and BERT 512 tokens; GPT two 1,024; GPT three 2,048; too small for a document. -> A, quick timeline.
- O2 2020 Patrick Lewis et al., Facebook AI, retrieval-augmented generation: keep knowledge outside, fetch passages, paste in; "context management" meant "retrieval because no room". -> A.
- O3 Windows explode: Anthropic 100K May 2023; GPT four Turbo 128K by Nov 2023; Gemini one point five a million, Feb 2024. Obvious conclusion: retrieval is over. -> A; B voices "so just put everything in".
- O4 July 2023 Nelson Liu et al., Stanford, "Lost in the Middle": start and end used better than middle. -> A.
- O5 Nov 2023 Greg Kamradt needle in a haystack, charts had holes. -> A.
- O6 2025, agents running hundreds of steps: "context engineering" = deciding at each step which tokens go in, in what order, what's dropped or compressed. Anthropic's blog: finite resource, diminishing returns, smallest set of high-signal tokens. -> A defines the term.

## The Idea: desk, not library

- I1 Desk analogy: researcher, small desk, library behind; assistant clears desk and lays out fresh papers; she reads all before speaking; no memory between rounds. -> A; one-point comparison.
- I2 Mapping: desk = context window (max tokens in one request, plus output for most APIs); papers = tokens (pieces of words, about 4 characters or three quarters of a word; check tokenizer for code); assistant = harness; model reads everything every time. -> A.
- I3 Four bills per token. -> A signposts.
- I4 Memory: every token leaves a key and value in every layer = KV cache; Llama three point one eight B in bf16 stores 128 KiB per token; 100,000-token session about 12.2 GiB, close to the weights (about 16 GB); on an API it shows up in price and rate limits. -> A, re-explains KV cache in one breath; B: "but on an API that's not my problem"; A: the provider's problem becomes your price.
- I5 Money: per token, input and output separately; example $3/M in, $15/M out (mid-tier 2025, check pricing); 100K prompt = 30 cents per call before any output. -> A.
- I6 Prefill: run whole prompt through every layer before first token; compute-heavy; most of time to first token. About 2 FLOPs per parameter per token plus attention. For the 8B model (32 layers, width 4,096) attention per token at position n about 4x32x4096xn, equals the 16 GFLOPs of weight work at about 30,000. Past 30K attention dominates, prefill faster than linear. At assumed 100 TFLOP/s: 0.15 s at 1K, 1.5 s at 8K, 8 s at 32K, over a minute at 128K. Back-of-envelope; providers differ. -> A in words, worked example; B asks "why does attention catch up".
- I7 Attention: fourth cost, not on a bill; more tokens competing; come back to it. -> A.
- F1 Figure 001 what's on the desk: stable top (system prompt, tool definitions, memory file), cache breakpoint, then retrieved chunks, history, tool results (often 80%+), current message; model writes at the end. -> A describes top to bottom as a stack.
- I8 Proportions: history and tool results are the bulk; system prompt is a rounding error; most context management is "what to do with tool results". -> A; B surprised about system prompt.

## The Idea: loop resends everything

- I9 Model has no memory between calls; harness gives memory by resending the whole conversation. -> B voices wrong model "doesn't the API keep the conversation?"; A corrects.
- I10 Minimal loop described: list of messages, call with everything, append reply, stop if not a tool call, run tools, append results. -> A in words, no code.
- I11 Step k sends about k times the per-step size. -> A.
- PR1 Predict: 120 steps, 2,000 base, 900 per step; total input tokens and $ at $3/M. Answer: about 6.7M tokens, about $20; final context only 110,000; triangle, half of 120 x 110,000; quadratic: double steps, roughly quadruple; with caching about $2.40 (1.25x writes, 0.1x reads). -> A asks, B guesses low (120 x 110K or ~13M?) -> B guesses ~110K x 120 ≈ 13 million, A: that's the rectangle, it's the triangle, half.
- F2 Figure 002: four steps, bars growing; billed 3K, 5K, 8K, 11K; pale prefix seen before, solid new part; total cost = area of triangle. -> A describes bars.

## The Idea: prompt caching

- I12 Re-explain prefix caching: server that computed KV for a prefix skips that prefill next time. APIs sell it as prompt caching: keep processed prefix a few minutes, bill later requests with exact same start at a discount, lower latency. -> A.
- I13 Anthropic: mark the end with a cache breakpoint (cache_control), every token before must be identical; writes 1.25x, reads about 0.1x; default lifetime 5 minutes, refreshed on each hit. OpenAI automatic above about 1,024 tokens. Check docs. -> A.
- I14 Agent loop is the perfect customer: history only grows at the end. -> A.
- I15 First hard rule: about order, not size. Anything that changes goes as late as possible; one changed token invalidates cache for everything after it. -> A states plainly.
- I16 Timestamp in first line of system prompt: full price every call. Reordering tool definitions, e.g. iterating a Python set: same. -> A; B laughs at the set.
- I17 Twist: any strategy that edits old history breaks the cache; dropping oldest message changes what follows the system prompt; summarizing rewrites the middle; re-process at full price, in fact at 1.25x write price. Sometimes fewer tokens costs more. -> B voices "fewer tokens is always cheaper"; A corrects.

## The Idea: attention dilution

- I18 Recall attention from building GPT two: query vs every key, softmax (scores into positive weights summing to 1, bigger scores exponentially more), weighted average of values. Weights add to 1: fixed budget split across every token. -> A.
- I19 Logit = raw score before softmax; +1 multiplies unnormalized weight by e, about 2.7. Toy: relevant token leads by 3, others equal; share = e cubed over (e cubed + n - 1). Worked in words: 1,000 tokens -> about 2%; 10,000 -> 0.2%; 100,000 -> 0.02%. Lead needed for 50%: 6.9, 9.2, 11.5; each 10x more context needs about 2.3 more points (the natural log of n). Computed with Python. -> A, in words with small example ("about twenty times heavier"); never reads the formula.
- I20 Real models much better: many heads and layers, very sharp learned attention for copying. But pressure is real, much worse with near-misses: a hundred TIMEOUT_MS lines. -> B pushes back "but real models aren't this dumb"; A agrees and says where it bites.
- I21 Term attention dilution; why failure two happens even when everything fits. -> A.

## The Idea: lost in the middle

- I22 Liu et al. 2023: question + 20 retrieved docs, one with the answer, moved first to last; accuracy traces a U, high first, high-ish last, lowest middle. -> A.
- I23 GPT three point five Turbo, 20 docs: middle positions below closed-book baseline (no documents). Having the answer in the wrong place worse than not having it. Numbers from memory; shape is robust. -> B: "worse than nothing?"; A confirms with caveat.
- F3 Figure 003: accuracy vs position, U; primacy, recency; dashed closed-book line; middle dips below it; schematic. Newer models flatten on easy tests, comes back with distractors and harder questions. -> A describes.
- I24 Why a U: partly understood; training data puts important things at start and end; causal attention, early tokens seen by every later token, models park attention on first tokens; position encodings like RoPE make far tokens score a bit lower, favoring recent. -> A.
- I25 Practical rules: instructions and question at the end near where model writes; most important material at start or end; fewer, more relevant documents beat more. -> A.

## The Idea: needle in a haystack

- I26 Kamradt's test: long filler (Paul Graham essays), insert sandwich/Dolores Park sentence at a depth, ask, grid of lengths and depths, heat map. Early long-context models had red patches. -> A.
- I27 Claude two point one scored poorly; Anthropic: adding one line to the start of the answer ("Here is the most relevant sentence in the context:") took it from 27% to 98%. How much was framing. -> A; B reacts.
- I28 Most frontier models near-perfect today; doesn't mean they use long context well. -> B voices "so it's solved"; A gives three reasons.
- I29 Reason 1: lexical match, shares rare words, found like grep; NoLiMa (2025) removes overlap, one step of reasoning, accuracy falls steeply with length. -> A.
- I30 Reason 2: one needle, nothing like it; RULER (NVIDIA 2024) multiple needles, distractors, tracing variables, aggregation; effective context length (longest input meeting an accuracy bar vs max API accepts) often much shorter. -> A.
- I31 Reason 3: finding isn't using; Chroma 2025 "Context Rot": degrading with length even on simple tasks. -> A.
- I32 Window size = ceiling; needle score = smoke test; accuracy on your task at your lengths. -> A.

## The Idea: the toolbox

- I33 Every strategy answers: of everything the agent could know, what goes on the desk this step? None free: trade tokens for missed info, extra calls, or latency. -> A.
- I34 Stuff/preload: whole corpus, cache, nothing missed, cheaper than you'd guess; fails when doesn't fit, near-misses, first-call latency; good for one doc or small repo queried many times within cache life. -> A.
- I35 RAG definition; chunking (too small loses meaning "it returns 3", too big wastes tokens; code: one function or class per chunk with path and imports; his AST lookup already does this); search: BM25 keywords for identifiers, embeddings for paraphrase, cross-encoder reranker on top, often biggest single win, like the model he trains. Throws away whatever ranked low; weak on multi-hop unless it can search repeatedly. -> A, with B connecting to his ranker.
- I36 Just-in-time loading: retrieval as tools (grep, read lines 40-90, list directory), light references; Claude Code works this way, no vector index; more steps and latency, trusts model; most systems preload a little (memory file, directory layout), load rest on demand. -> A.
- I37 Tool-result truncation: cheapest big win; cap e.g. 2,000 tokens; keep head and tail (errors at the end); say what you cut and how to get more. Cousin: clear old tool results, stub "read utils.py, 340 lines"; Anthropic calls it context editing. Throws away verbatim old outputs; breaks cache at the edit, so batch. -> A.
- I38 Compaction: near the limit, model summarizes history; continue from summary plus last turns. Keeps gist, loses specifics (exact numbers, odd log line, what seemed unimportant). Tell prompt what must survive (decisions, paths, exact values); test it; fails silently. -> A.
- I39 Memory files: agent writes facts on purpose to NOTES.md or progress file, re-reads; the CLAUDE.md pattern (one with a lessons-learned section past agents added to); MemGPT 2023: window as RAM, external storage as disk, model pages, virtual memory for text. Throws away what it didn't think to write down. -> A; told as his/our own CLAUDE.md, not "this site".
- I40 Sub-agents: separate loop, fresh context, returns short result; e.g. find every caller of retry() passing a timeout; burns 50,000 tokens, returns 1,000; window thrown away. Anthropic's multi-agent research system beat single agent on broad research, far more total tokens (around 15x a chat). Throws away what it saw but didn't report; best when independent and answer much smaller than evidence. -> B voices "so sub-agents save tokens"; A: total goes up.
- F5 Figure 005: main agent ~8K window with three short reports; three sub-agents each ~50K read and thrown away; ~1K report each. Total up; main window size and noise down. -> A describes.

## The Idea: interactive simulator (Figure 004)

- F4a Toy 30-step coding task: greps, reads, test runs, one 12K log; step 27 needs config from step 3; step 28 needs error line from step 9 log. Controls: strategy (stuff, truncate, summarize, sub-agent), step slider, window size (32K/64K/128K/200K), cache toggle. Prices $3/$15. -> A, as "picture a little simulator I played with".
- F4b Stuff at 64K: repo alone 40K; by step 9 the log pushes over limit, task dead. 128K: fits, everything visible, cache on whole run about a dollar though most tokens billed (about 2.2M); cache off about $6.70. Stuffing and caching are partners. -> A.
- F4c Truncate at 64K: never overflows, by step 27 both config and log gone; re-read or guess; cache hit rate drops because every drop changes the start of history. -> A.
- F4d Summarize at 64K: one compaction; small config fact survives, exact log line doesn't; typical compaction failure. -> A.
- F4e Sub-agent: main window under 7K, cheapest run; cache helps less (each window new); trusting five reports. -> A.
- F4f Truncate and summarize at 128K identical: strategies only differ once you hit the wall; test tasks must be long enough. -> A; B makes the inference.
- PR2 Predict: on the benchmark (94K fake codebase, 30 questions one session, every fifth looks back), rank stuff, retrieval 40K sliding window, rolling summary on look-back accuracy, tokens, dollars. Answer (expectation not measurement): look-back: stuff and summary good, sliding bad; tokens: stuff highest (94K x 30 = about 2.9M before history), sliding lowest; dollars closer than tokens (stuff mostly cache reads; summary breaks cache at each compaction); two-hop: don't assume stuff wins, 100 files defining TIMEOUT_MS = near-miss haystack, the one to measure. -> A asks, B guesses (stuff cheapest? or stuff most expensive), A reveals.

## The Idea: context engineering, the job

- I41 A good harness: keeps top stable and changes at end; caps every tool result with note; loads just in time, preloads only what's needed nearly every step; writes down what matters in a memory file; compacts with tested prompt, rarely, in big batches (each costs a full-price re-read); delegates wide noisy exploration to sub-agents; measures tokens in, cached, dollars, seconds, success, on tasks long enough to hit the wall. Last one people skip. -> A, as a spoken run-through, not a list read out; B picks up "measures".

## Build It

- B0 Overview: small harness + benchmark; fake codebase ~100 modules, all define the same two constants with different values; 30 questions in one long session; most two-hop (function -> module it calls -> that module's constant); every fifth refers back. Any API; Anthropic SDK; OpenAI same shape; local model on the Spark behind an OpenAI-compatible server (V L L M or llama.cpp server) costs nothing, shows prefill directly, small local models score lower. Use small cheap model. -> A.
- B1 Task 0 setup: venv, key never committed, corpus generator writes services files and questions with answers; each module: TIMEOUT_MS, RETRY_LIMIT, entry handle_x calling helper_y from another module, filler functions. Seed 0: 100 files, 374,799 chars, about 93,699 tokens by chars/4; tiktoken about 4.0 chars/token; Claude's tokenizer differs, use counting endpoint or usage; 150 files (about 140K tokens) if window is 200K and you want stuffing uncomfortable. -> A, setup in a sentence, the corpus design and measured numbers in more.
- B2 Task 1 ledger: one function, one JSON line per call: tag, uncached input, cache read, cache write, output, cost, seconds; budget guard hard stop (default $5); example prices for small model $1/M in, $5 out. Anthropic's input_tokens counts only uncached; total = input + cache read + cache creation. Cache a big system prompt by marking the last stable block. Sanity check: same 5,000-token system prompt twice -> first ~5,000 cache write, second ~5,000 cache read and shorter seconds. -> A; B voices "input tokens is the prompt size" wrong model; A corrects.
- B3 Task 2 tools: grep (regex over corpus, path:line rows, max lines, footer of omitted count) and read (numbered lines, cap ~2,000 tokens, head and tail with explicit marker "lines 61-340 omitted, call read with start/end"). Truncation is the part that teaches. Bad path/regex returns an error string, not exception, so the model can recover. Line numbers let it ask for precise ranges. grep TIMEOUT_MS shows near-miss haystack: 100 lines differing only in file name and number. -> A.
- B4 Task 3 loop: one loop, three policies in build_context; 30 questions in one session; cap 8 tool calls per question. (a) stuff: no tools, whole corpus in system prompt, each file wrapped with its path, cached, append-only Q&A history. (b) retrieval only: short system prompt, grep and read, append-only until past window (40K), drop oldest whole question; never half a tool exchange (API rejects a tool result whose call is missing). (c) rolling summary + retrieval: at 80% of window, compaction call over oldest two thirds, replaced by one "Notes from earlier in this session" message; keep recent third verbatim. Hints: count tokens from previous usage plus chars/4 since; compaction prompt says what must survive (every question number, final answer, exact module names and numbers); read a real summary and check it; score by normalizing. -> A; B asks why not drop half an exchange.
- B5 Task 4 matrix: three seeds, 9 sessions of 30 questions; results and ledger files; report per strategy: two-hop accuracy, recall accuracy, total input tokens, cache-read fraction, dollars, median and p90 seconds per question, largest context. Check seed 0 and budget first; drop to 60 files if stuffing too pricey, say so. Agent reviews harness for skewing bugs (breakpoint in wrong place, tool result counted twice, scoring too strict). -> A.
- B6 Task 5 needle: synthetic near-miss records ("Server rk-0412 in rack 7 was last patched on ..."), one needle, depth 0 first to 1 last; grid 4K, 16K, 64K (128K if allowed), depths 0 to 1 in tenths, five trials; question after the context; 165 calls, about 4.6M input tokens, about $4.60 at $1/M; three trials under $3; small model, weaker shows curve more. Non-literal variant: the server in the same rack as rk-0412 patched most recently, find two lines and compare; two lengths. Record accuracy per cell and time per length. -> A.
- B7 Task 6 stretch sub-agent strategy (d): fresh sub-agent per question with tools and only that question, returns answer plus one-line note; main history holds questions and notes; predict recall before running. -> A, short; B guesses recall.
- B8 Done when: ledger sums match provider dashboard within a few percent; report table for a, b, c on three seeds; read a compaction summary and found what it dropped; accuracy vs depth plot for three lengths; say which strategy for a 94K repo and which for 10M. -> A, folded into conversation.

## Measure

- M1 Strategy table columns (said as what you'd collect, not read): two-hop, recall, input tokens, cache-read share, cost, median seconds, max context; plus your prediction for cost winner. Predictions, not measured results. -> A states honestly not run.
- M2 (a) stuff: most input tokens (about 2.9M), cache-read share above 90%, cost close to others; first question slowest (full prefill ~94K), later faster; two-hop is the interesting cell: if clearly below (b), measured attention dilution. -> A.
- M3 (b) sliding window: cheapest on two-hop, fails recall whose original slid out; plot recall correctness vs how many questions back. -> A.
- M4 (c) summary: recovers most recall if compaction keeps answers; cost bump at each compaction, lower cache-read share than (a). -> A.
- M5 Latency: (b) and (c) several tool round trips, median seconds exceed cached (a) despite smaller prompts; just-in-time trades latency for tokens. -> B surprised; A explains.
- M6 Needle grid expectations: current model, literal: flat near 100% at 4K and 16K, maybe a few middle misses at 64K, "needle tests saturated"; non-literal row is where the curve appears, dipping in the middle and falling with length; seconds per call grow with length; if near linear 4K-64K, attention's quadratic part not visible yet (recall ~30K crossover for 8B); on the Spark with local model, time to first token is the prefill curve measured. -> A.
- M7 One number: cost per correct answer; 30% cheaper and 20% less accurate is usually not cheaper. -> A, B works an example? Keep it A with B reaction.

## Break It

- K1 Time at the top: current time as first line of stuffed system prompt, rerun (a) on one seed; cache-read share collapses near zero, input cost jumps roughly 9x (every call writes whole prompt at 1.25x instead of reading at 0.1x). Move it to last user message, cache returns. -> "what if" exchange.
- K2 Remove truncation: read returns whole files, make a giant file of 400,000 lines; context-length error or one call that costs as much as the rest of the session. Every tool needs a cap. -> exchange.
- K3 Starve the summarizer: at most 100 words; recall drops toward (b); read it and list what dropped; compaction doesn't fail loudly, it forgets. -> exchange.
- K4 Poison the haystack: 30 files with TIMEOUT_MS marked deprecated, different value, some handle functions mention them in a comment; stuffing sorts inside attention, retrieval sorts with grep and reading; which degrades more on your model? -> exchange; left open as a real question.

## Explain It Back (content must appear)

- E1 Bill grows faster than linear: stateless, resends; step k about k times; total about n squared over 2 times per-step size; fix one caching (append-only, prefix billed ~tenth, skips prefill, near-linear if top doesn't change); fix two keep per-step growth small (cap outputs, clear old results, sub-agents); compaction caps size but rewrites prefix, full-price re-read, do rarely. -> Covered across loop/caching/toolbox; ending B restates.
- E2 Needle 100% at 1M: finds one sentence with obvious word overlap anywhere; good sign position encoding and attention work at that length; doesn't show finding without overlap, picking right among near-identical, combining two far facts, reasoning quality; attention fixed budget; trust only accuracy on your task at your lengths. -> In needle section; A adds "good sign position encoding works".
- E3 Lost in the middle: as above; reasons; rules; fewer better-ranked docs, where a reranker earns its keep. -> lost-in-middle section plus RAG reranker link.
- E4 Stuff vs retrieve: stuff when fits with room, many questions within cache life, not full of near-duplicates (one contract, one paper, small repo); retrieve when doesn't fit, changes too often to cache, near-duplicates; growing from 100K to 10M stuffing impossible, so retrieval quality: structural chunking, hybrid keyword plus embedding, reranker, repeated search for multi-hop. -> Dedicated exchange near Measure ("which would you ship for 94K vs 10M").
- E5 Scale: 1,000 concurrent sessions x 100K on Llama three point one eight B: memory first; 128 KiB/token, 12.2 GiB/session, about 12 TiB total vs 16 GB weights; node of eight 80 GB GPUs = 640 GB; a few dozen sessions per node; rest wait, get evicted (pay full prefill again), or offload KV to CPU memory or disk; every token kept out is memory back, context management is serving cost too; prefill second: 100K prefills take seconds, compete with decoding; prefix caching helps both if prefixes stable. -> Dedicated scaling exchange before the close.

## Go Deeper / Connections

- G1 One sentence: Liu et al. "Lost in the Middle" and Anthropic's "Effective context engineering for AI agents". -> A, one line.
- C1 Next: what makes a task long-horizon; inside an agent harness, where build_context choices show up again; reranker is a context-management tool. -> A, one or two sentences.

## Flow

Problem scene -> B's "if it's in there it's seen" + "API remembers" -> Origin -> desk -> four bills
(memory, money, prefill, attention) -> what's on the desk -> loop resends -> Predict 120 steps ->
caching and the order rule -> fewer tokens can cost more -> attention dilution arithmetic -> lost in
the middle -> needle -> toolbox (stuff, RAG, JIT, truncation, compaction, memory files, sub-agents)
-> simulator walk-through -> Predict ranking -> the harness's job -> Build It tasks -> Measure
expectations + cost per correct answer -> stuff vs retrieve at 94K vs 10M -> Break It four ->
scaling question -> one line of sources + connections -> B restates, A sharpens, stop.
