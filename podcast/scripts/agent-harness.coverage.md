# Coverage: agent-harness

Lesson src/lessons/agent-harness.mdx vs podcast/scripts/agent-harness.md. Item IDs match
podcast/outlines/agent-harness.md. All numbers checked against the lesson; derived numbers noted at the end.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (containers, prefix caching re-explained) | Sandbox; Cost | "A VM runs a whole second operating system"; "same mechanism as prefix caching in your own serving engine" | covered |
| T2 under five dollars | Build It setup | "well under five dollars" | covered |
| P1 TinyFish agents, overnight batch | Problem | "The one that runs by itself, overnight, on a few hundred tasks" | covered |
| P2 http.server never exits | Problem | "that command never exits. It's a server." | covered |
| P3 4 MB log, million tokens, rejected | Problem | "a four megabyte log. The result is about a million tokens" | covered |
| P4 "Error", 26 identical calls, $3 | Problem | "Twenty-six identical calls later... three dollars to change nothing" | covered |
| P5 README curl pipe sh | Problem | "download this setup script from some URL and pipe it straight into a shell" | covered |
| P6 not model failures (B's wrong model) | Problem | B: "that all sounds like the model being dumb"; A: "None of those are model failures" | covered |
| P7 harness definition | Problem | "It's the harness. All the ordinary software around an LLM" | covered |
| P8 same model, different harness, different scores | Problem | "two agents with the same model and different harnesses" | covered |
| O1 ReAct 2022 Thought/Action/Observation | Origin | "Twenty twenty-two, Shunyu Yao and colleagues published a paper called ReAct" | covered |
| O2 regex parsing fragile | Origin | "a regex had to guess where the command started" | covered |
| O3 June 2023 function calling; Anthropic, Google within a year | Origin | "in June twenty twenty-three, OpenAI added function calling" | covered |
| O4 SWE-bench 2023 | Origin | "SWE-bench, from Jimenez and colleagues in twenty twenty-three" | covered |
| O5 SWE-agent, ACI, 100-line viewer, linter edit | Origin | "the agent-computer interface"; "a hundred numbered lines at a time" | covered |
| O6 Building effective agents, tools over prompt | Origin | "spent more time tuning the tools than tuning the prompt" | covered |
| I1 sink over the phone | Loop | "You're helping a friend fix their sink. Over the phone." | covered |
| I2 no memory (B's wrong model) | Loop | B: "I thought the conversation was, like, held on their side" | covered |
| I3 twelve-line loop | Loop | "The loop is about twelve lines" | covered |
| I4 tool call definition, read_file core.py example | Loop | "the model emits something that means please run read file" | covered |
| I5 reads whole history every time | Loop | "reads the whole history, top to bottom, every time" | covered |
| F1 loop diagram + stop list | Loop | "You'd draw a ring..." | covered |
| S1 end_turn vs tool_use | Stop | "It says end turn, instead of tool use" | covered |
| S2 stop conditions term | Stop | "the harness keeps its own stop conditions" | covered |
| S3 max steps 30-50 | Stop | "Thirty to fifty is plenty" | covered |
| S4 token/dollar budget | Stop | "a token or dollar budget" | covered |
| S5 wall clock 20 min on 2 min task | Stop | "twenty minutes on a two-minute task is broken" | covered |
| S6 repeats x3, inject message | Stop | "same tool with the same arguments three times in a row" | covered |
| S7 context window | Stop | "The context window is the maximum number of tokens" | covered |
| S8 max_tokens truncation | Stop | "If stop reason says max tokens... half-written JSON" | covered |
| S9 log every stop with reason | Stop | "every stop gets logged with its reason" | covered |
| W1 same shape across providers, check docs | Wire | "The providers all have the same shape" | covered |
| W2 tool description + JSON Schema, read_file example | Wire | "JSON Schema is just a standard way to describe" | covered |
| W3 model never sees Python, tokens every call | Wire | "Never. It sees that JSON, turned into prompt tokens" | covered |
| W4 content blocks, tool_use with id/name/args | Wire | "the reply is a list of content blocks" | covered |
| W5 tool_result blocks matched by id, one user message | Wire | "One per call, matched by id, all in a single user message" | covered |
| F2 two-column id matching; missing result rejected | Wire | "picture it as two columns"; "Then the API rejects your request" | covered |
| W6 is_error, errors are data, normal Tuesday | Wire | "Errors are data for the model, not exceptions" | covered |
| PC1 parallel tool call term | Parallel | "That's a parallel tool call" | covered |
| PC2 sum vs max, 6 s vs 2 s (B's queue model) | Parallel | B: "the harness puts them in a queue"; "six seconds... about two" | covered |
| PC3 read-only parallel, writes serial | Parallel | "read-only tools can run in parallel. Writes go one at a time" | covered |
| PC4 all results in one message | Parallel | "collect every result, in one message" | covered |
| PC5 can disable; latency win | Parallel | "They're a latency win, not a must-have" | covered |
| R1 Predict billed ~16,000, six times | Watch a run | "About sixteen thousand. Roughly six times" | covered |
| F3 trace replay walk | Watch a run | "Picture a little replay you can step through" ... final summary | covered |
| R2 three moments | Watch a run | "So, three moments from that one run" | covered |
| D1 new teammate frame | Tools | "a new teammate who's very smart" | covered |
| D2 names and descriptions; search vs grep2 | Tools | "A tool called grep two, described as search tool" | covered |
| D3 relative paths, poka-yoke | Tools | "Poka-yoke. It's Japanese for mistake-proofing" | covered |
| D4 fine vs coarse | Tools | "A fine-grained tool does one small step" | covered |
| D5 AST tool coarse; three-step dance; escape hatch | Tools | "Where is user session defined, in one call" | covered |
| D6 four error levels | Tools | "Picture four versions of the same failed edit, as a ladder" | covered |
| D7 clip head+tail, cap 50 + 312 more, numbered lines, diff after edit, exit code | Tools | "three hundred twelve more, narrow your pattern" | covered |
| D8 3-4 chars/token, 8,000 chars = 2,000-2,700 tokens | Tools | "about two thousand to twenty-seven hundred tokens" | covered |
| X1 prompt injection; no prompt fixes it (B's wrong model) | Sandbox | B: "put in the system prompt, ignore any instructions" | covered |
| F4 nested rings | Sandbox | "Think of it as rings, from the inside out" | covered |
| X2 schema + path inside root, ../.ssh, symlinks | Sandbox | "dot dot slash, dot dot slash, dot ssh" | covered |
| X3 gate, human-in-the-loop, Claude Code | Sandbox | "That's human-in-the-loop" | covered |
| X4 allowlist prefix trap, metacharacters, denied as error | Sandbox | B proposes; "also starts with python three dash m unittest" | covered |
| X5 process group, 3.14 Mac grandchild alive, killpg (B's wrong model) | Sandbox | B: "Doesn't a timeout just... kill the thing?" | covered |
| X6 CPU cap works (SIGXCPU), RLIMIT_AS ValueError on macOS | Sandbox | "died with a signal called SIG X CPU"; "raised a value error" | covered |
| X7 scrubbed env PATH, HOME, LANG | Sandbox | "only three things. PATH... HOME... LANG" | covered |
| X8 docker flags, cgroups, container vs VM, approve all inside | Sandbox | "no network at all, one gigabyte of memory, one CPU, at most two hundred fifty-six processes" | covered |
| X9 Mac version, toy repo only | Sandbox | "Good enough for a five-file toy repo" | covered |
| RT1/RT2 429/529/503, 1-2-4-8 + jitter, retry-after, 5-6 tries, 400/401 not retryable | Retries | "One second, two, four, eight. Plus some randomness" | covered |
| RT3 tool failures to model (B's wrong model) | Retries | B: "the harness should just take another shot" | covered |
| C1 two walls + degraded long context | Context | "Models get worse at using information that's buried" | covered |
| C2 clip, clear with stub keeping ids, compact, sub-agent | Context | "cleared: read core dot p y, a hundred ninety lines" | covered |
| C3 trades info for room | Context | "Every one of those trades information for room" | covered |
| PL1/PL2 to-do tool, re-shown near end, Claude Code, skip for now | Plans | "Give it a tool to write a to-do list" | covered |
| TR1 trace term | Traces | "That record's called a trace" | covered |
| TR2 JSONL, flush, crash at 17, fields, OTel/LangSmith/MLflow | Traces | "if the process crashes at step seventeen" | covered |
| TR3 read the traces | Traces | "Then you read the traces. Not the summary." | covered |
| K1 prefix + steps, n-squared, doubling quadruples (B's "doubles") | Cost | B: "My gut would've said doubles" | covered |
| K2 Predict 3.6x, 438k vs 1.6M | Cost | "About three point six... about one point six million" | covered |
| F5 sliders, curves, window warning | Cost | "Picture a little chart with four sliders" | covered |
| K3 prompt caching, tenth price, 1.25x write, byte-identical, clearing breaks cache | Cost | "about a tenth of the normal input price" | covered |
| K4 latency, 30 x 4 s = two minutes | Cost | "two minutes before you've counted any tool time" | covered |
| E1 verifier hidden, can't edit | Evals | "the agent must not be able to see or edit the verifier" | covered |
| E2 repeats, 15 outcomes, noise | Evals | "Five tasks with three runs each gives you fifteen outcomes" | covered |
| E3 more than pass/fail | Evals | "halves the steps is a real improvement" | covered |
| E4 pass@k vs pass^k, 0.6 cubed ~22% | Evals | B: "about point two two. Twenty-two percent" | covered |
| E5 RL environment minus learning | Evals | "almost exactly an RL environment, with the learning taken out" | covered |
| B0 stdlib only | Build It | "standard library only" | covered |
| B1 setup, $10 limit, ripgrep | Build It | "set a monthly spend limit, say ten dollars" | covered |
| B2 sample repo, top_k bug, hidden checks | Build It | "Top k sorts the wrong way round" | covered |
| B3 five tasks | Build It | "So a real bug, a behavior change, a new feature, a multi-file refactor, and a question" | covered |
| B4 verifiers checked both ways; top_k scope watch | Build It | "I ran that script and checked every verifier both ways" | covered |
| B5 llm.py, retries, test "say hi" | Build It | "Send say hi with no tools, and print the usage" | covered |
| B6 tools.py details | Build It | "Safe path takes the root"; "exits with code one. That's not an error" | covered |
| B7 agent.py, permit/execute/run_agent, hints, by hand 4-8 steps | Build It | "Done, max steps, budget, repeat, or truncated" | covered |
| B8 tracer + viewer, textContent escaping | Build It | "never as HTML"; B: "prompt injection, but aimed at me" | covered |
| B9 runner, fake model only | Build It | "I didn't run it against a real model" | covered |
| B10 v1/v2, difflib cutoff 0.5, alternatives, change one thing | Build It | "a similarity cutoff of about half works" | covered |
| B11 done-when list | Build It | "And you're done when a few things are true" | covered |
| M1 predict first; cost, wall time, model vs tools share | Measure | "before you run anything, guess" | covered |
| M2 locate 3-5, fix-test 4-8, rename hardest; estimates | Measure | "these are estimates... not from a real run" | covered |
| M3 tokens low tens of k, 50-150k rename | Measure | "maybe fifty to a hundred fifty thousand for rename" | covered |
| M4 model time dominates | Measure | "model time dominates wall time almost completely" | covered |
| M5 v2 cuts errors/steps; pass rate may not move | Measure | "the pass rate might not move at all" | covered |
| M6 top_k scope creep | Measure | "That's scope creep" | covered |
| K-1 useless errors | Break It | "make the errors useless" | covered |
| K-2 flood, 2 MB, 140,000 lines, half a million tokens | Break It | "A hundred forty thousand copies of the same log line" | covered |
| K-3 leak process, port 8099, address already in use | Break It | "holding port eighty ninety-nine" | covered |
| K-4 inject PWNED, gate shows it, model-noticing isn't a defense | Break It | "Defenses that depend on the model noticing aren't defenses" | covered |
| EB1 harness vs model, one iteration | Loop + Close | ring description; close "The harness decides what any request can actually do" | covered |
| EB2 good tool | Tools | ladder + coarse tools + "steps are the unit of both cost and time" | covered |
| EB3 damage layers | Sandbox | rings, "worst case is a ruined throwaway copy" | covered |
| EB4 30 to 300 steps | Cost | B: "a hundred times the input tokens... tens of dollars" | covered |
| EB5 11/15 vs 12/15 | Measure | B: "version one passes eleven out of fifteen" | covered |
| G1 sources | Go Deeper | "read the SWE-agent paper... Simon Willison" | covered |
| G2 connections incl. verifier gaming, observability | Go Deeper | "find every way to pass your check" | covered (observability link compressed to traces mention) |

Derived numbers not written in the lesson: per-call context in the trace replay (call 1 about 1,400, call 8
about 2,600, total about 16,300) recomputed from the figure's data, consistent with the lesson's text; slider
defaults at 30 steps / 800 / 3,000 / $3 per million: about $1.31 uncached vs about $0.22 cached (from the
figure's own formula); fixed prefix about 1,350 tokens (from the figure source); "a few hundred times over"
(a million tokens vs about 2,000-2,700); "ten steps is forty-five, a hundred is nearly five thousand" (sum
0..n-1); 0.6 x 0.6 = 0.36 intermediate.
