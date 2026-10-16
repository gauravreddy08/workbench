# Coverage: api-lifecycle

Lesson src/lessons/api-lifecycle.mdx vs podcast/scripts/api-lifecycle.md. Item IDs match
podcast/outlines/api-lifecycle.md. Numbers checked against the lesson; derived numbers are listed at
the end.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 Two meanings | Problem; Two lifecycles | "It was the small one. And in an interview, you say both." | covered |
| T2 Prereqs re-explained (server, bench.py, scoreboard, token bucket) | Problem; One request | "bench dot pi, your benchmark harness"; "Quick reminder of how that works. Each key has a bucket" | covered |
| T3 Mac with fake model, Spark at end | Build It | "runs on your Mac, with a fake model" | covered |
| P1 Interview scene, requests and responses | Problem | "And you say... something about requests and responses" | covered |
| P2 Rename in 2024, thirty seconds, tests pass, curl works | Problem | "In twenty twenty-four, when the reasoning models showed up" | covered |
| P3 A week later, ~1 s, default 16, ignored field, nothing crashed | Problem | B: "the server should've rejected it"; "Which was sixteen" | covered |
| P4 Promise to people whose code you can't see or redeploy | Problem | "A promise to people whose code you can't see, and can't redeploy" | covered |
| O1 Late 90s, 1996 server / 1999 browser | Origin | "a server written in ninety-six had to keep working with a browser from ninety-nine" | covered |
| O2 Fielding, HTTP/1.1, 2000 dissertation, REST = independent evolution | Origin | B: "JSON over H T T P"; "clients and servers evolve independently" | covered |
| O3 Stripe, real cards, date versioning, pinned accounts | Origin | "pin every account to the version it started on" | covered |
| F1 Figure 001 two strips, feedback loop, dashed links | Two lifecycles | "Picture two strips, one above the other" | covered |
| I1 Term API | Two lifecycles | "application programming interface, is just the set of requests" | covered |
| I2 Say both in interview | Problem | "And in an interview, you say both." | covered |
| D1 Contract, write first, test-before-fix | Design | B: "FastAPI already spits one out"; "before the implementation decides it for you" | covered |
| D2 OpenAPI (Swagger), JSON Schema, what you get from one file | Design | "It used to be called Swagger"; "Human-readable docs. Client libraries" | covered |
| D3 Day one vs day four hundred | Design | "expensive on day four hundred" | covered |
| D4 Names: nouns, methods, snake_case, plural, same word | Design | "If it's max tokens in one endpoint, it can't be..." | covered |
| D5 Pagination: offset vs cursor, OpenAI after/has_more, B-tree seek | Design | "give me items two hundred to two ninety-nine"; "one hop down the tree" | covered |
| D6 Error shape: message/type/code/param | Design | "Message, which is a sentence for humans" | covered |
| D7 Status code categories | Design | "Four oh one is 'who are you?'" | covered |
| D8 Problem Details RFC 9457, 2023 | Design | "R F C ninety-four fifty-seven, from twenty twenty-three" | covered |
| D9 FastAPI default: detail list, 422 | Design | "a key called detail with a list inside it ... four twenty-two" | covered |
| ID1 Three failure modes; SDK retries twice on listed codes | Idempotency | "it arrived, it succeeded, and the answer got lost"; "retries twice by default" | covered |
| ID2 Idempotent term; x = 5; GET/PUT/DELETE; double charge; temperature | Idempotency | B: "retrying seems harmless"; "Setting x to five is idempotent" | covered |
| PR1 Predict retry-gen: 3, ~4.3 s, GPU lock ghost requests, retry storm | Idempotency | B guesses "two? ... just one"; "Three. And all three run to completion" | covered |
| ID3 Idempotency key, Stripe, UUID per logical op, table | Idempotency | "once per logical request. Not per attempt." | covered |
| F2 Figure 002 sequence | Idempotency | "Client on the left, server in the middle, the key store on the right" | covered |
| ID4 Hash body; draft 422 / 409 | Idempotency | "suggested four twenty-two for 'same key, different body'" | covered |
| ID5 Atomic claim vs check-then-insert race | Idempotency | B: "check if the key's in the table, and if it isn't, insert it?" | covered |
| ID6 Scope per key; 24 h; TTL | Idempotency | "Otherwise Alice's retry could replay Bob's response" | covered |
| ID7 Draft expired, de facto convention | Idempotency | "That draft actually expired without ever becoming one" | covered |
| AU1 Authentication vs authorization | Authentication | "And then authorization is the next question" | covered |
| AU2 API keys: hash, constant time, prefix, several | Authentication | "Store only a hash"; B: "constant time?" | covered |
| AU3 OAuth | Authentication | "Let this app read my GitHub repos." | covered |
| AU4 JWT | Authentication | "this is user forty-two, scope chat, expires at three p m" | covered |
| AU5 Keys get name, limit, version record | Authentication | "You can't email the people still on version one" | covered |
| B1 Build against contract | Build/doc/test | "the YAML is the source of truth" | covered |
| B2 Document from contract, Redocly, what good docs add | Build/doc/test | "Docs generated from the YAML can't drift from it" | covered |
| B3 Contract test, Schemathesis, consumer-driven, Pact | Build/doc/test | B: "How's that different from a normal test"; "Pact's the best-known tool" | covered |
| B4 Beta vs GA, changelog | Build/doc/test | "G A, general availability, means 'this is the promise'" | covered |
| B5 Observe, RED, tag version and key | Build/doc/test | "Rate, errors, duration" | covered |
| V1 Additive vs breaking | Versioning | "An additive change adds something new" | covered |
| PR2 Predict breaking (a)-(e), open/closed enums, pattern | Versioning | B: "That one's fine" on the default; "It's breaking, and silently" | covered |
| V2 Hyrum's Law, tolerant readers, Fowler | Versioning | "Every observable behaviour of your system will be depended on" | covered |
| V3 URL vs header versioning | Versioning | "In the URL, slash v one ... Or in a header" | covered |
| V4 Stripe dates, override header, version-change modules, acacia/basil | Versioning | B: "hundreds of copies"; "walks backwards through those little modules" | covered |
| F3 Figure 003 one core, two adapters | Versioning | "Picture old bench dot pi on the top left" | covered |
| V5 Copy-the-server anti-pattern | Versioning | "fixing every bug twice for three years" | covered |
| DR1 Deprecation, sunset, migration window | Deprecate | "Months for a public API. Often a year or more" | covered |
| DR2 Deprecation/Sunset/Link headers, RFCs, historical reasons | Deprecate | "R F C ninety-seven forty-five, from March twenty twenty-five" | covered |
| DR3 Telling isn't enough | Deprecate | "Telling people isn't enough." | covered |
| F4 Figure 004 interactive, toy model | Deprecate | "two sliders ... two toggles"; "about four out of five" | covered |
| DR4 Long tail 70% / 10% | Deprecate | "The first seventy percent of clients move quickly" | covered |
| DR5 Brownout, GitHub | Deprecate | B: "You deliberately take your own API down?" | covered |
| DR6 410 not 404 | Deprecate | "answer with four ten, which means 'gone.'" | covered |
| S1 REST wins/costs | Styles | "over-fetching and under-fetching" | covered |
| S2 RPC, gRPC 2015, proto, wins/costs, older than REST | Styles | "released in twenty fifteen"; "R P C is actually older than REST" | covered |
| S3 Chat completions is RPC in REST's clothes | Styles | B: "I'd always assumed it was REST"; "R P C wearing REST's clothes" | covered |
| S4 GraphQL 2012/2015, wins/costs, evolves without versions | Styles | "GraphQL evolves without versions, by design" | covered |
| OC1 Why OpenAI-compatible, list of servers, de facto | OpenAI-compatible | "Nobody voted on it." | covered |
| OC2 Don't own contract, moving target, subset | OpenAI-compatible | "you don't own your contract" | covered |
| OC3 SDK exception classes, 422 slips past, 409 retried | OpenAI-compatible | "the SDK raises an Unprocessable Entity Error instead" | covered |
| OC4 Fidelity: streaming, done line, usage, finish_reason; Hyrum | OpenAI-compatible | "The little 'done' line at the very end of a stream" | covered |
| R1 Zoom to milliseconds | One request | "From months to milliseconds." | covered |
| F5 Figure 005 interactive | One request | "a row of eleven buttons, one per stage" | covered |
| R2 TLS termination, proxy timeouts 504, 502 | One request | "a five oh four ... can come from a layer your app never even saw" | covered |
| R3 Request ID + log stage | One request | "It never says no. It just watches." | covered |
| R4 Routing 404/405/410 | One request | "four oh five, wrong method" | covered |
| R5 Parse body 413/415/400 (422), before dependencies | One request | "Hold on to that." | covered |
| R6 Middleware term, logging outermost, auth 401/403, rate limit after auth | One request | "Middleware is code that wraps every request"; B: "Because it needs to know whose limit it is." | covered |
| R7 Validation 400 with param | One request | "Does the body actually match the schema?" | covered |
| R8 Idempotency after validation, before handler | One request | "so invalid requests never get a stored answer" | covered |
| R9 Handler, 500/503/504 | One request | "well-formed, authenticated, within budget, and not duplicates" | covered |
| R10 Serialization, response schema check, headers, log line | One request | "Better you find out than the client." | covered |
| PR3 Predict order: 422 then 401; body cap; both paths | One request | B: "Four oh one both times."; "FastAPI zero point one forty-three" | covered |
| R11 Ordering logic | One request | B: "cheap stuff first"; "the requests you most need to see ... got rejected" | covered |
| BI0 Layout | Build It | "a folder next to your server and bench dot pi with the contract, a core..." | covered |
| BI1 t1 setup, fake core, counter, non-streaming | Build It | "a little global counter that goes up by one every time generate runs" | covered |
| BI2 t2 contract first, limits, Redocly, 1 warning, ~60 KB | Build It | "one warning, no license listed ... about sixty kilobytes" | covered |
| BI3 t3 default vs handlers, hints, no stack trace | Build It | B: "Why not put the actual error in the five hundred?" | covered |
| BI4 t4 SQLite store, function logic, policies, test | Build It | B: "And if the work itself throws halfway?" | covered |
| BI5 t5 make_key, dependency, lock, 429, headers, compare_digest, token cost | Build It | B: "Why a lock? Python's got the GIL." | covered |
| BI6 t6 break, consumer contract, spec diff, ~40 lines, oasdiff, agent review | Build It | B: "They're flipped."; "about forty lines" | covered |
| BI7 t7 v2 adapters, extra forbid, deprecated flag, headers, per-key log, migrate, 410, real core | Build It | "The four ten is the documentation for anyone who shows up late." | covered |
| BI8 Done-when | Build It | "And you're done when the whole thing hangs together." | covered |
| M1 Setup caveat | Measure | "fake core on an M-series Mac, all on localhost" | covered |
| M2 3 gens ~4.3 s; 1 gen ~2.5 s | Measure | "one generation ... after about two and a half seconds" | covered |
| M3 422 vs 400 param messages; broken JSON 422 | Measure | "With yours, Bad Request Error, four hundred, param is messages" | covered |
| M4 ~1.4 ms, ~2.0 ms | Measure | "about one point four milliseconds ... about two milliseconds" | covered |
| M5 16 of 256; per-key row his to fill | Measure; Build It | "asked for two hundred fifty-six tokens and got sixteen"; per-key script in t7 | covered |
| M6 Under a ten-thousandth vs ~20 s; API layer stops wasted GPU work | Measure | B: "That's got to slow the server down."; "one ten-thousandth of the request" | covered |
| M7 Retry row, TTFT grows by two generations | Measure | "would grow by two full generations" | covered |
| BK1 Remove extra forbid; strict vs tolerant | Break It | B: "Earlier you said clients should be tolerant readers." | covered |
| BK2 Global keys, Alice/Bob, counters, 422 | Break It | "Any cache keyed by something the client chooses" | covered |
| BK3 Streaming with key | Break It | "What should the server replay?" | covered |
| BK4 Limiter before auth, NAT, two limiters | Break It | B: "you do want something in front of auth"; "Two limiters." | covered |
| E1 Under-a-minute answer | Close | B's restatement; A: "the same promise at two zoom levels" | covered |
| E2 What's breaking, harmless-looking ones, Hyrum | Versioning; Close | "A changed default breaks people. A new enum value breaks people." | covered |
| E3 Idempotency end to end | Idempotency; One request | covered across ID1-ID6, R8 | covered |
| E4 3 to 3,000 clients, 20 servers: shared store, SET NX / unique constraint, 20x limits, cache lookups, 30M rows ~60 GB, shorter TTL or pointer, deprecation project | Scaling | "thirty million rows ... About sixty gigabytes" | covered |
| E5 OpenAI-compatible: network effects and cost | OpenAI-compatible | covered across OC1-OC4 | covered |
| G1 Fielding ch. 5, Brandur's two posts | Close | "Fielding's dissertation, chapter five" | covered |
| C1 Connections (indexes, threads race, rate limits, observability, TLS, HTTP from scratch, load balancing, Fireworks) | throughout | "you'll see in the indexes lesson"; "behind a load balancer" | covered (transactions lesson not named; atomic insert explained directly) |

## Numbers derived, not written in the lesson

- Figure 004 readouts (from running the figure's own toy model, 200 clients, defaults deprecate at month 18): six-month window, no notice: about four in five of v1 clients break (151 of 192); headers and emails: about two in five (80); headers plus brownouts: about a third (60); twelve-month window with both: about one in ten (22).
- "Twenty seconds is twenty thousand milliseconds; two out of twenty thousand is one ten-thousandth" (worked form of the lesson's "under a ten-thousandth").
- "Thirty million requests a day ... sixty million kilobytes" (worked form of the lesson's 30 million rows / about 60 GB).

## Explanations added for the ear (not claims the lesson makes)

- Why non-constant-time comparison leaks (timing of first mismatch).
- Unix timestamp = seconds since 1970; NAT = many machines sharing one public address.
- Why the bucket needs a lock despite the GIL (GIL protects interpreter internals, not read-then-write logic).
- Why request-side vs response-side enum rules are mirror images.
