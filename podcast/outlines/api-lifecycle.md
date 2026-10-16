# Outline: api-lifecycle

Source: src/lessons/api-lifecycle.mdx. Curriculum entry: "The life of an API." Question: what is an
API lifecycle, from design to deprecation? Why: an interview question he missed, and a real job:
versioning, idempotency, auth, rate limits, docs. Build: design, version and deprecate an endpoint of
his inference server without breaking a client.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Two meanings of "API lifecycle": months-long life of the product, milliseconds-long life of one request. -> Set up in the Problem and Two lifecycles; B voices the "requests and responses" answer.
- T2 Prereqs: Baseline vs Fireworks (OpenAI-compatible server_naive.py on the Spark, bench.py harness and scoreboard); Rate limits (token bucket). -> A re-explains each briefly where first needed (bench.py in the Problem, bucket in auth/rate-limit part).
- T3 Everything runs on the Mac with a fake model, swap in the Spark at the end. -> A at the start of Build It.

## The Problem

- P1 Interviewer asks "What's an API lifecycle?"; you say something about requests and responses; they nod and move on. -> A opens on the scene; B admits that's what they'd say.
- P2 Spark server takes max_tokens; OpenAI renamed it max_completion_tokens in 2024 when reasoning models arrived; you rename it; thirty seconds; tests pass, server starts, curl works. -> A tells it as his own story.
- P3 A week later: every request finishes in about a second, decode numbers shifted. bench.py still sends max_tokens 256; server silently ignores unknown fields; used new field's default, 16 tokens; every scoreboard row since measures something else. Nothing crashed, nothing logged; the only client broke and neither noticed. -> A; B voices the wrong model "renaming is harmless / it'd have errored"; A corrects.
- P4 An API is a promise to people whose code you can't see and can't redeploy; lifecycle = making, keeping, changing, ending that promise without hurting anyone; inside it the smaller lifecycle of each request where promises are checked. -> A, the thesis.

## Origin

- O1 Late 1990s: millions of servers, hundreds of millions of browsers, nobody can upgrade at once; 1996 server must work with 1999 browser and vice versa. -> A as story.
- O2 Roy Fielding, helped write HTTP/1.1, 2000 PhD dissertation, named REST; point not JSON over HTTP but clients and servers evolve independently; interface uniform, stable, self-describing. -> A; B voices "REST means JSON over HTTP" and A corrects.
- O3 Ten years later APIs as products; Stripe, customers' code charged real cards; couldn't break it, couldn't stop improving; date versioning with each account pinned became most copied idea. You build small versions of both. -> A.

## The Idea: two lifecycles

- F1 Figure 001: top row design, build, document, test, release, observe, version, deprecate, retire; observe feeds back into design; versions walk off the right edge; bottom row client, TLS, route, middleware (auth, limit, log), validate, handler, serialize, response; design decides rules, pipeline enforces them, URL picks the version. -> A describes as two strips over the phone.
- I1 Term API: set of requests one program agrees to accept from another and what it promises back; web API = URLs, methods, bodies, responses, errors over HTTP; hard part: once someone depends on it you can't take it back on your schedule. -> A.
- I2 In an interview, say both meanings; usually they mean the first. -> A.

## Design

- D1 Term contract: exact written list of what API accepts and returns; clients written against it, server tested against it. Write after code (FastAPI generates one) or before; contract-first like test before bug fix: decide the promise before implementation decides for you. -> A; B: "FastAPI generates it anyway, why write it?" (natural objection).
- D2 Term OpenAPI (formerly Swagger), YAML or JSON; every path, bodies as JSON Schema (term: shape of JSON: fields, types, required, ranges). From one file: docs, client SDKs, validators, mock servers, contract test input. Contract-first = YAML exists before Python and Python is checked against it. -> A.
- D3 Design decisions cheap on day one, expensive on day four hundred. -> A.
- D4 Resources and names: URLs name things (nouns), methods say what you do; GET /v1/models lists, GET one model, POST chat completions creates. One convention: snake_case (OpenAI's), plural collections, same word everywhere; max_tokens can't be maxTokens or token_limit elsewhere; consistency lets clients guess. -> A, examples spoken as "slash v one slash models".
- D5 Pagination from day one, adding later changes what list returns and breaks readers. Offset ("items 200 to 299"; simple, slow on big tables, skips or repeats under inserts) vs cursor (opaque token past the last item; stable, fast with index, can't jump to page 50). OpenAI: after ID and has_more. Indexes lesson: "rows after this ID" is one B-tree seek, "skip a million rows" walks them. -> A; B asks why offset drifts; brief re-explain of B-tree seek.
- D6 Errors in one shape, so one error handler. OpenAI shape: error object with message (humans, can change), type and code (programs, part of contract), param (which field). -> A describes the shape in words, no JSON read.
- D7 Status codes carry category: 400 your request wrong, 401 who are you, 403 can't do that, 404 no such thing, 409 conflict, 429 slow down, 500 our fault, 503 overloaded. -> A says them as a quick spoken list.
- D8 Problem Details, RFC 9457, application/problem+json, type/title/status/detail/instance, replaced RFC 7807 in 2023, if not bound to a dialect. -> A, one line.
- D9 Worst choice is FastAPI's default: different shape (detail list) and status 422 from everything else; you'll measure it. -> A.

## Idempotency

- ID1 Three failure modes: never arrived, arrived and failed, arrived, succeeded and answer lost. Client can't tell last from first, so retries. OpenAI Python SDK retries twice by default on timeouts, connection errors, 408, 409, 429 and 5xx (read in SDK source; check your version). -> A; B voices "retries are harmless, worst case you get the answer twice".
- ID2 Term idempotent: twice same as once; x = 5 yes, add 5 no; GET, PUT, DELETE idempotent, POST isn't. POST chat completions runs model again; payments double charge; yours burns GPU and at temperature above zero returns a different answer. -> A.
- PR1 Predict retry-gen: timeout 1 s, max retries 2, model 2 s; how many generations; with GPU lock? Answer: three; server doesn't know the client left; all three complete; client gets error anyway; measured 3 generations, about 4.3 s, zero useful answers; with lock attempts queue and run, two ghost requests for everyone else; retry storm from Rate limits. -> A asks, B guesses one or two, reveal.
- ID3 Term idempotency key, popularised by Stripe: random UUID per logical operation, sent on every attempt in Idempotency-Key header. Server table: key, hash of body, status, saved response. First claims, retry finds it. -> A.
- F2 Figure 002: client, server, key store lanes; attempt one inserts K running, generates 2 s; client times out at 1 s, retries same K, server sees running, 409; SDK retries 409; by attempt three done, saved body replayed 200; GPU ran once. -> A narrates as a phone diagram.
- ID4 Hash the body: same key different body = client bug; error not replay; Stripe does this; IETF draft suggested 422 for mismatch, 409 for still running. -> A.
- ID5 Claim atomically: two retries at same moment; check-then-insert has a gap, the race from processes-threads lesson; single INSERT ON CONFLICT DO NOTHING and count rows; database makes it one step. -> B voices check-then-insert as their plan; A corrects, re-explains race.
- ID6 Scope and expire: keys belong to an API key, never global, or Alice's retry replays Bob's response; Stripe documents keys pruned after 24 hours; without TTL table grows forever. -> A.
- ID7 Idempotency-Key header was heading to IETF standard; draft expired without RFC; de facto convention (Stripe, payment and cloud APIs). -> A, one line.

## Authentication

- AU1 Term authentication: who is calling; authorization: allowed to do this? -> A.
- AU2 API key: long random secret, Authorization Bearer; OpenAI, Fireworks, yours. Store only hash (leak doesn't leak keys), constant-time compare, readable prefix to spot leaks in logs and git, several per caller to rotate. -> A; B asks why constant time (natural).
- AU3 OAuth 2.0: third-party app on behalf of a user, "let this app read my GitHub repos"; user approves on provider's site; short-lived access token with scopes; overkill for three clients you know. -> A.
- AU4 JWT: small signed JSON doc, claims (user 42, scope chat, expires 15:00); signature check instead of DB lookup, scales across servers; can't easily revoke, so short-lived; OAuth tokens often JWTs. -> A.
- AU5 For your server, API keys; each gets name, rate limit, record of API version; that record makes deprecation possible: can't email v1 users you don't know. -> A.

## Build, document, test, release, observe

- B1 Build against the contract: generate pydantic models from OpenAPI (datamodel-code-generator) or hand-write and test; YAML is source of truth. -> A.
- B2 Document from the contract; generated docs can't drift, hand-written will; Redocly CLI one command; good docs add example per endpoint, every error code and what to do, changelog. -> A.
- B3 Term contract test: checks interface not logic; catches breaking changes not wrong answers. Two flavours: provider checks itself against its spec (Schemathesis generates hundreds of requests from OpenAPI); consumer-driven (each client records requests and fields it reads; server runs them in CI; Pact best known); the second would have caught the rename. -> A; B asks how a contract test differs from a unit test.
- B4 Release in stages: beta (shape may change) vs GA general availability (the promise; changes only by rules); GA starts the clock of the timeline figure; changelog every time. -> A.
- B5 Observe per endpoint, per version, per key; RED metrics: rate, errors by status, duration percentiles; tag with version and key name; "who's still on v1" is a query; jump in 400s from one key after deploy says whose integration broke. Observability lesson covers tools. -> A.

## Versioning

- V1 Term additive change (new endpoint, optional request field, new response field; safe in principle) vs breaking change (some correct client stops working or silently gets different results: remove/rename field, optional to required, type or default change, status meaning change). -> A.
- PR2 Predict breaking: (a) optional top_p: safe; (b) system_fingerprint in responses: safe unless strict validator; (c) new finish_reason content_filter: grey zone, switch with no default; Stripe marks enums open or closed; (d) default max_tokens 256 to 512: breaking silently, longer slower pricier; (e) reject unknown fields: breaking, 400 for field always sent. Pattern: breaking is about what clients rely on. -> A runs it as conversation, B judges each, gets some wrong (says d and c are safe).
- V2 Hyrum's Law (Hyrum Wright, Google): with enough users every observable behaviour is depended on: field order, error wording, how long it takes. Can't stop it; reduce: document guarantees, tolerant readers (term, Martin Fowler: read only needed fields, ignore the rest), test contract not implementation. -> A.
- V3 URL vs header versioning: URL /v1 visible in every log line, curl, browser bar; plain path routing, easy to send v1 and v2 to different servers; coarse v1, v2, rarely v3; OpenAI and most public APIs. Header (anthropic-version 2023-06-01, Stripe-Version): visible only if you print headers; one URL, app reads header; fine granularity, monthly; Stripe, Anthropic, GitHub (dates since 2022). -> A as spoken comparison, not table.
- V4 Stripe date versioning: version is a date; account default; Stripe-Version header overrides to test upgrade; 2019 code keeps 2019 behaviour until upgraded on purpose. Brandur Leach 2017: code written for newest; each breaking change ships version-change module transforming new response back to old; responses walk backward until they match. Since 2024-09-30 acacia: monthly versions with no breaking changes, major with breaking twice a year, named (acacia, basil); date plus name; check docs; the idea is the pin. -> A; B asks "so Stripe keeps hundreds of copies of the API?" and A corrects.
- F3 Figure 003: old bench.py sending max_tokens 256 and new client sending max_completion_tokens; v1 adapter maps max_tokens to limit and adds Deprecation/Sunset; v2 adapter maps max_completion_tokens to limit with strict fields; both call one core generate(messages, limit), one GPU lock; tested once, used by both; bug fix in core fixes all, breaking change touches only an adapter. -> A describes.
- V5 Worst versioning: copy the whole server into v2 and fix bugs twice for three years. -> A.

## Deprecate and retire

- DR1 Term deprecation: announcement, still works, warning not behaviour change. Retirement / sunset: date it stops; also a header name. Migration window between: months for public APIs, a year or more for money. -> A.
- DR2 Headers in-band: Deprecation (RFC 9745, March 2025) when deprecated, as at-sign plus Unix timestamp; Sunset (RFC 8594, 2019) when it stops, old HTTP date format, mismatch "for historical reasons"; Link rel deprecation to migration guide. None change behaviour; full v1 response; client that logs warning migrates in time. -> A describes the headers in words.
- DR3 Telling people isn't enough. -> A.
- F4 Figure 004 interactive: v1 and v2 stage bands; drag deprecation date and window; toggle headers+emails and brownouts; black line v1 clients, blue v2; readouts at deprecation and still on v1 at sunset; toy model 200 clients. Defaults: about four in five of v1 clients break; headers alone about two in five; both about a third; twelve-month window with both about one in ten. -> A describes what you see as you drag.
- DR4 Long tail: first 70% move fast, last 10% forever, some never until something breaks. -> A.
- DR5 Term brownout: planned short announced outage before sunset, an hour at a time; finds the cron job by someone who left, notebook on forgotten VM; GitHub among others has run them. -> B: "you break it on purpose?" genuine objection.
- DR6 After sunset: 410 Gone with message pointing at v2, not 404; "existed and removed on purpose". -> A.

## REST, RPC, GraphQL

- S1 All above applies whatever style. REST: URLs name resources, methods act; OpenAPI; wins public APIs, caching, curl-ability, every language; costs over/under-fetching, "is this a resource" arguments. -> A, spoken comparison.
- S2 RPC term: remote call looks local; gRPC Google 2015; .proto Protocol Buffers; wins service-to-service: compact binary, HTTP/2, streaming, generated clients; costs not human readable, awkward from browsers; older than REST. -> A.
- S3 POST chat completions is RPC in REST's clothes; fine; most "REST" is pragmatic HTTP+JSON; name the trade-offs in interview. -> B voices "isn't the OpenAI API REST?"; A corrects.
- S4 GraphQL term: Facebook 2012, open-sourced 2015; one endpoint, client asks exactly the fields; typed schema; wins many frontends wanting different slices in one round trip; costs hard to cache, one query can cost a fortune, rate limit by cost; evolves without versions: add fields, mark old deprecated; new fields never surprise. -> A.

## OpenAI-compatible

- OC1 Nobody voted; OpenAI first API most used; SDKs let you change base_url; competitors: zero code changes to try them; vLLM, SGLang, llama.cpp server, Ollama, Fireworks, Together; Anthropic and Google publish compatible endpoints. Term de facto standard: by adoption not committee. Network effect of tutorials, SDKs, eval harnesses, agent frameworks. -> A.
- OC2 You don't own your contract; OpenAI changes it (max_completion_tokens, new usage fields, Responses API); pick a subset, write it in OpenAPI, document. -> A.
- OC3 Error shape part of compatibility: SDK maps status codes to exception classes (BadRequestError 400, AuthenticationError 401, RateLimitError 429) and retry decisions; 422 raises UnprocessableEntityError so OpenAI-written client doesn't catch; 409 for still running gets retried, which is what idempotency wants. -> A.
- OC4 Fidelity in details: streaming format, DONE sentinel, usage in last chunk, finish_reason values; Baseline vs Fireworks showed clients depend on them; Hyrum's Law on OpenAI's millions of users, so on yours. -> A.

## One request

- R1 Zoom to milliseconds; every promise enforced between socket and handler. -> A signpost.
- F5 Figure 005 interactive: eleven stages; click to see what each does and codes; send a request (ok, no key, broken JSON, over limit, duplicate, bad body, crash) and watch where it stops; most requests answered before the handler. -> A walks it.
- R2 TLS termination: decrypts HTTPS, usually a reverse proxy (Caddy, nginx), cloud LB, tailscale serve; plain HTTP on localhost; proxy owns timeouts, so 504 from a layer your app never saw; 502 if app down; handshake fail = connection dies. TLS lesson. -> A.
- R3 Request ID + log stage: stamps request id, timer, one log line out (route, key, status, latency); never says no. -> A.
- R4 Routing: method + path to function; v1 vs v2 decided here; 404, 405 (GET on POST route), 410 retired. HTTP from scratch builds this. -> A.
- R5 Read + parse body: size cap; 413 too large, 415 not JSON, 400 malformed (FastAPI default 422); in FastAPI happens before dependencies. -> A, setting up the predict.
- R6 Term middleware: wraps every request, runs before and after handler without it knowing; logging, auth, headers. Logging outermost sees every outcome. Auth 401/403 (403: real key not allowed, wrong scope, disabled model). Rate limit 429 after auth because it needs whose bucket; bucket keyed by API key from rate-limits lesson; Retry-After and x-ratelimit headers. -> A; re-explain token bucket briefly.
- R7 Validation: body vs schema, 400 with param. -> A.
- R8 Idempotency after validation (invalid never stored; Stripe same rule), before handler (replay skips GPU). -> A.
- R9 Handler sees only well-formed, authenticated, within-budget, non-duplicate; 200, 500 bug, 503 overloaded queue full, 504 deadline. -> A.
- R10 Serialization and response: JSON or SSE, optionally checked against response schema (500 if your response doesn't match: better you than the client); headers out: request ID, rate-limit, Deprecation/Sunset; log line with final status and latency feeds observability metrics. -> A.
- PR3 Predict order: auth as dependency; no key + broken JSON: 422 (FastAPI 0.143 parses body before dependencies); no key + valid JSON missing messages: 401. Order isn't whiteboard order; anonymous callers can make you parse big bodies (cap at proxy); error handler must rewrite both paths. -> A asks, B says 401 both times, reveal.
- R11 Ordering logic: cheap checks rejecting most traffic first; needs identity after auth; costs money last; logging wraps everything because rejected requests are what you need to see. -> B tries to state it; A sharpens.

## Build It

- BI0 Layout: inference folder with server_naive and bench.py, api folder with openapi.yaml, core, errors, keys, idem, app, make_key, contract folder with bench_contract and breaking. -> one sentence.
- BI1 t1 setup and fake core: venv, fastapi, uvicorn, httpx, openai, pyyaml, pytest; fake generate same signature as real; FAKE_SECONDS to make slow; counter of how often the "GPU" ran; returns chat.completion with "hello" repeated limit times, finish_reason length, usage; non-streaming only. -> A: setup in one sentence; the counter matters.
- BI2 t2 contract first: write openapi.yaml for the subset before app.py; frame with bearer auth security scheme and shared Error schema; TODOs: Idempotency-Key header, ChatRequest, ChatCompletion, every error status; decide every limit (messages at least one, max_tokens min/max, temperature range, role values, finish_reason values); 429 has Retry-After; every error refs Error; decisions are the design. Lint and build docs with Redocly; lint passed with one warning (no license), docs about 60 KB single HTML; read as a stranger. -> A.
- BI3 t3 validation and one error shape: first feel the default with the SDK, empty messages, max retries zero; errors.py: APIError class and four handlers (own raises, validation and broken JSON to 400 with param, 404/405 from routing, crash to 500 with request id); hints: exc.errors() loc like body, messages; drop first, join with dots for param; broken JSON json_invalid gets own code; never exception text in 500 (paths, versions, data). Default got UnprocessableEntityError 422 detail list; yours BadRequestError 400 with param and code. -> A.
- BI4 t4 idempotency store: SQLite table (owner, key, req_hash sha256 of canonical body, status 0 running else saved, body, created; primary key owner+key); survives restart, single-statement insert atomic. run_idempotent: no key just work; hash sorted JSON; insert on conflict do nothing, rowcount 1 = claimed; not claimed: different hash 422, status 0 409, else replay with Idempotent-Replayed true; claimed: run, save; on exception delete row then re-raise. Policies: TTL (Stripe 24 h), release failed key vs save-and-replay errors (Stripe v1 replays even 500s); cleanup. Test with FAKE_SECONDS 2, timeout 1, retries 4, Idempotency-Key header, read counter via debug endpoint; then no key. -> A; B asks why delete the row on failure.
- BI5 t5 keys and per-key limits: make_key prints wb_ plus random once, stores hash with name, rate 1, burst 5; keys.py dependency reads bearer, hashes, looks up, 401 missing vs unknown with different codes; take token from per-key bucket guarded by threading.Lock because sync handlers run in a thread pool; 429 with Retry-After whole seconds; x-ratelimit limit/remaining/reset headers so clients slow down before the wall; hmac compare_digest; decide whether invalid requests cost a token (in his version yes, auth and bucket run before body validation; defensible, else invalid requests free to spam). -> A; brief why lock (threads lesson).
- BI6 t6 break it wrong way: rename in v1 model with default 16, run bench.py, usage completion_tokens, nothing errored. Consumer contract: pytest sending exactly bench.py's requests and asserting on fields it reads; the test: max_tokens 7, assert status 200 and completion_tokens at most 7, fails with 16; one test per behaviour (error shape on bad key, finish_reason values, usage fields); FastAPI TestClient no server. Spec diff breaking.py: walk request and response schemas, follow refs, type change breaking; request: property removed, newly required, enum lost value; response: property removed, enum gained value warning; about 40 lines; printed max_tokens removed (clients still send it); CI against main; oasdiff for real. Revert, ask agent to review what they'd miss. -> A; B asks why request and response rules are mirror images.
- BI7 t7 ship v2: two thin routes; v1 max_tokens as before; v2 max_completion_tokens, extra forbid rejects unknown fields; both call core through run_idempotent. Spec: add v2, mark v1 deprecated true (docs strike it through); breaking.py still passes. Deprecation headers on every v1 response incl errors, Sunset HTTP date via email.utils format_datetime usegmt; Sunset not earlier than Deprecation (RFC 9745). Log key name and version; ten-line script v1 counts per key over last day = email list. Migrate bench.py to v2, warn on Deprecation header, rerun contract, key drops off. Sunset yesterday: 410 with version_retired code naming v2; keep the route, 410 is documentation. Swap fake core for real under GPU lock; API layer unchanged = layering right. -> A.
- BI8 Done when: spec lints, docs build, v1 deprecated; every error in shape and SDK raises matching class; FAKE_SECONDS 2 once with key, several without; key reuse different body 422, Alice can't replay Bob; rename fails both guards, v2 passes both; bench on v2 no warnings, v1 headers until sunset, 410 after, per-key report. -> folded into the walk, not read as list.

## Measure

- M1 Setup: fake core, M-series Mac, localhost, FastAPI 0.143, OpenAI SDK 3.x; milliseconds differ, shape same. -> A.
- M2 No key, timeout 1 s, 2 retries, 2 s model: 3 generations, timeout error after about 4.3 s. With key, 4 retries: 1 generation, replayed 200 after about 2.5 s. -> A.
- M3 empty messages: default UnprocessableEntityError 422; yours BadRequestError 400 param messages. Broken JSON no key: 422. -> A.
- M4 p50 through auth + bucket, zero sleep: about 1.4 ms; plus idempotency (one SQLite insert + update): about 2.0 ms. -> A with comparison.
- M5 completion_tokens after rename asking 256: 16. v1 requests per key before and after migration: his to fill. -> A.
- M6 API layer a millisecond or two on localhost (rough, few dozen sequential requests); 256-token request about 20 s on GPU (Baseline vs Fireworks); pipeline under a ten-thousandth; never skip auth/validation/idempotency for speed; API layer's job is to stop wasted GPU work. -> B voices "doesn't all this middleware slow it down?"; A answers with numbers.
- M7 Retry row: without key client got nothing, server did three requests' work; with GPU lock they'd queue and every other user's TTFT (time to first token) grows by two full generations. -> A.

## Break It

- BK1 Remove extra forbid on v2, send max_tokens: succeeds with default; tolerant reading great for clients; for servers silently ignoring a meant field makes renames invisible; strict on new contracts, tolerant only where promised. -> B: "but you told clients to be tolerant readers" (contradiction); A resolves.
- BK2 Global idempotency keys: drop owner; alice and bob both send key 1 (people use counters); Bob gets Alice's completion, reads her data; with body hash he gets 422 unless bodies match; any cache keyed by client-chosen thing must also be keyed by who. -> A.
- BK3 Streaming with a key: kill mid-stream, retry; replay events so far? all once done? not obvious; many APIs only honour idempotency on non-streaming or document something; write down yours; if "generates again", say so in spec. -> A.
- BK4 Rate limiter before auth keyed by IP: everyone behind one NAT (office, Tailscale exit node) shares bucket; stranger sending garbage keys spends real users' budget; fix: two limiters, coarse per-IP before auth against key guessing, real per-key after. -> A; brief NAT gloss.

## Explain It Back (substance must be in the conversation)

- E1 Under-a-minute answer: two meanings; product stages with what each means; request stages; design decides rules, pipeline enforces. -> B's closing restatement, A sharpens.
- E2 What's breaking: correct client stops or silently differs; obvious ones; harmless-looking: default change, enum value, rejecting unknown fields, rename on ignoring server worst; Hyrum. -> covered in V1/PR2/V2/P3; B echoes.
- E3 Idempotency: networks lose responses, can't tell, retries; key per logical op; store key, hash, status, response; atomic insert-if-absent; 409 running, replay done, 422 different body; per key scope; TTL; validation before claim. -> covered ID section and R8.
- E4 Scale from 3 to 3,000 clients across 20 servers: ideas stay, state moves; retry lands on different server so shared idempotency store (Redis or Postgres), still atomic (Redis SET NX with expiry, Postgres unique constraint); shared rate limits or each key gets 20 times its limit; cache key lookups; store size = requests per day times TTL times response size: 3,000 clients times 10,000 requests a day times 2 KB, 24 h TTL = 30 million rows, about 60 GB; so shorter TTL or hash plus pointer; deprecation becomes project, per-version per-key usage, months-long windows, brownouts, tail is hundreds. -> Own exchange near the end: B asks "what if this were a real product with thousands of clients", A walks through with worked arithmetic.
- E5 OpenAI-compatible: network effects, base URL, "change one line"; cost: don't own contract, moving target, documented subset, error shape and status codes (exception classes, retry decisions), streaming format down to DONE. -> covered in OC section.

## Go Deeper / Connections

- G1 Best sources: Fielding's dissertation chapter 5, Brandur Leach's two Stripe posts (versioning, idempotency). -> One closing line from A before the final exchange.
- C1 Connections: transactions lesson (why atomic insert is safe), load balancing (where single-server store stops being enough), observability, HTTP from scratch, TLS. -> Woven in where relevant; load balancing in the scale exchange.

## Flow

1. Problem: interview scene, B's "requests and responses" answer; the rename story; B's wrong model; thesis.
2. Origin: Fielding/REST (B's "JSON over HTTP" correction), Stripe pin.
3. Two lifecycles, figure 001, API term.
4. Design: contract, OpenAPI, names, pagination, errors and status codes.
5. Idempotency: failure modes, B's "retries are harmless", predict, key, figure 002, three details, header status.
6. Auth: three forms, keys for us, version record.
7. Build/document/test/release/observe.
8. Versioning: additive vs breaking, predict as conversation, Hyrum, URL vs header, Stripe, figure 003.
9. Deprecate/retire: headers, figure 004, brownouts, 410.
10. Styles: REST, RPC, GraphQL.
11. OpenAI-compatible.
12. One request: figure 005, stages, predict on order, ordering logic.
13. Build It t1-t7 as a walk, done-when folded in.
14. Measure: numbers with comparisons.
15. Break It: four "what if" exchanges.
16. Scale question (E4).
17. Go Deeper line, then B restates the core idea, A sharpens, end.
