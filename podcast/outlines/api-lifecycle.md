# Outline: api-lifecycle

Source: src/lessons/api-lifecycle.mdx. Curriculum: "The life of an API." What is an API lifecycle,
from design to deprecation? (Source: an interview question he missed.)

## The one big idea

An API is a promise to code you can't see and can't redeploy. Whether a change is "breaking"
isn't about what you meant to promise; it's about what clients actually rely on, and the worst
breaks are silent. The lifecycle is the discipline of making, keeping, changing and ending that
promise; the request pipeline is where every promise gets checked, in milliseconds.

## Opening scene

The interview: "What's an API lifecycle?" He says something about requests and responses; they nod
and move on. Then the same gap on his own machine: a thirty-second rename of max_tokens on the
Spark server; the benchmark still sends the old name; the server quietly ignores it and uses a
default of sixteen; weeks of scoreboard numbers measure something else. Nothing errored.

## Wrong mental model B voices

- "API lifecycle means a request comes in and a response goes out" (his interview answer).
- "If the tests pass and nothing errors, nothing broke."
- "Deprecating means sending an email and turning it off on the date."

## Story beats

1. The interview miss, then the rename. Nothing crashed, the only client broke, neither noticed.
2. History: by the late nineties nobody could upgrade every browser and server at once; Fielding's
   dissertation names REST around independent evolution. Then APIs as products: Stripe can't break
   code that charges real cards, but can't stop improving; it pins each account to a dated version.
3. Two lifecycles in one word: months (product) and milliseconds (one request). Say both.
4. Design first: write the promise down before the code (OpenAPI); one error shape so clients write
   one handler; FastAPI's default error is a different shape and code, so an OpenAI client misses it.
5. Retries: three ways a call fails, client can't tell two apart, so it retries. My fake model with
   a short client timeout ran three times and the client got nothing. Idempotency key: same key on
   every retry, server runs it once and replays. Scoped per caller, else one caller sees another's.
6. Breaking vs additive; the sneaky ones (a changed default, a new enum value, a rename on a
   server that ignores unknown fields). Hyrum's Law. Consumer contract test written from the
   client's side would have caught the rename.
7. Versioning by URL or by header (Stripe's pin). One core, thin adapters per version.
   Deprecation headers in every old response; the long tail; brownouts to find forgotten clients;
   after sunset answer "gone", not "not found".
8. One request's trip: cheap rejections first, auth before rate limiting, the GPU last, logging
   wraps everything. The whole API layer is about a millisecond next to seconds on the GPU; its
   job is to stop wasted GPU work. OpenAI-compatible: you don't own your contract.

## Numbers worth saying

- sixteen (the silent default)
- three generations, zero answers (the retry test)
- "about a millisecond" for the API layer versus seconds on the GPU

## Left to the written lesson

Pagination styles, auth flavours (OAuth, JWT), the five build/doc/test/release/observe details,
URL vs header table, Stripe's current release naming, exact header names and RFC numbers, the
FastAPI ordering quirk, REST/RPC/GraphQL comparison, all tasks, the spec diff tool, the scaling
question.
