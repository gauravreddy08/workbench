# Outline: prefix-caching

Source: src/lessons/prefix-caching.mdx. Curriculum: "Paged attention and prefix caching." How do
servers share KV cache between requests with the same prefix, and when do they evict it?

## The one big idea

A token's notes (its keys and values) depend only on the tokens before it. So any two prompts that
start the same way have identical notes for that shared start, and a server can keep them and skip
the reread. Cutting the notes into small numbered blocks, the way an operating system cuts memory
into pages, is what makes keeping and sharing them possible.

## Opening scene

His agent: a long system prompt that never changes, resent on every step. The server rereads it
every time, computes the exact same notes it computed a second ago, and throws them away. About a
second of waiting per step to rediscover what it already knew.

## Wrong mental model B voices

"So the cache makes everything faster, the answer comes out faster too." A corrects: it only skips
the reading of the prompt (the wait before the first word). Every word after that still reads the
whole model and all the notes, so typing speed doesn't move. (From the lesson's "TTFT, not decode"
predict and explain-back.) Earlier B also guesses "just size each reservation right", which is
impossible because you don't know how long the answer will be.

## Story beats

1. The agent rereading its own system prompt; chat is worse, every turn resends all earlier turns.
2. The quieter problem: memory. Each request reserves room for the longest possible answer; most of
   the GPU ends up reserved and empty. B: why not size it right? You can't know the answer length.
3. Berkeley, two thousand twenty-three: they measured, and most reserved memory held nothing. The fix
   came out of an operating systems textbook: pages. Re-explain virtual memory in two sentences.
   PagedAttention, vLLM. Blocks, a table per request saying where each block lives.
4. Once a request is a list of pointers, two requests can point at the same block. Sharing inside one
   request (several answers to one prompt) with copy-on-write, said briefly.
5. The leap across requests: why it's exact. Each token's notes depend only on what's before it.
   Same start, identical notes. The prompt-layout consequence: a date line near the top kills it.
6. Naming a block: fingerprint of its words plus the fingerprint of the block before it, like a git
   commit. Walk until the first miss. Wrong fingerprints are the worst bug: fluent, wrong answers.
7. Eviction: never throw out a block someone is using; otherwise least recently used; optional
   timer for idle blocks. Throw out tails before heads. The round-robin surprise: cache holds half
   the prompts and hits zero.
8. What it buys and doesn't (B's wrong model). Then it scales out: route the conversation back to
   the machine that has it; the API "cached input" discount is this mechanism sold as a product,
   with a timer as a promise.
9. Ending: B restates; A sharpens (it's exact because of causality, and it saves the wait, not the
   typing).

## Numbers worth saying

About a second (cold prefill of the system prompt on the Spark). Sixteen words per block. Zero hits
when a cache holding half the prompts meets strict rotation. Five minutes and about a tenth (the API
timer and read price).

## Left to the written lesson

KV bytes per token and the reservation arithmetic, the three kinds of fragmentation by name, block
table mapping table, the n equals four block count, radix tree details and cache-aware scheduling,
hash collision math and salts, timing leaks, the code and tests, Hugging Face cache internals, the
hit-rate tables and sweep, Mac timings, OpenAI and Fireworks specifics, every Break It except the
timestamp and the tiny hash.
