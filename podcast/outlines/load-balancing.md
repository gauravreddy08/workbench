# Outline: load-balancing

Source: src/lessons/load-balancing.mdx. Curriculum entry: "Load balancers and state." Question: what
happens when you run three copies of a server, and why does state break everything? Why: the first
step from one machine to many; stateless design is the whole trick.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: one process can't see another's memory, lost updates (threads lesson); network round trips (latency lesson); p99 helps for Measure. -> Re-explained inline where each comes up (separate heaps, lost update, round-trip cost, coordinated omission, the knee). "Today" list skipped.

## The Problem

- P1 Scene: FastAPI app, login creates a session (who you are, cart, conversation) in a Python dict; three copies behind a balancer; next click "who are you?"; refresh, knows you; refresh, gone. -> A opens on this scene.
- P2 He already got this right in the diagnostic: login landed on A, session in A's memory, next request on B whose dict never heard of you; three copies = three separate heaps; one process can't see another's memory. -> B gives the right answer confidently; A confirms, re-explains "separate heap" in one line.
- P3 The interesting part is after: pin to A forever? A crashes or restarts for deploy? Why do LLM servers want the same machine, and why fine there but a trap for carts? How to choose when one request is 40 ms and the next 40 s? -> A lists as the questions the episode answers, spoken.

## Origin

- O1 1994 NCSA web server (home of Mosaic) outgrew one machine; Katz, Butler, McGrath: several identical servers, DNS hands each visitor a different address in rotation; DNS round robin still around. -> A story.
- O2 Two problems: DNS answers cached for minutes so a dead server kept getting visitors; couldn't send a returning visitor back to the same machine, which mattered once app servers kept logins/carts in memory. -> A; B asks why caching matters.
- O3 Late 1990s dedicated load balancer boxes: checked which servers alive, could pin a user. -> A.
- O4 Pinning worked until servers had to restart. 2011 Heroku's Adam Wiggins, The Twelve-Factor App; factor six: processes stateless, share nothing, names sticky sessions as a violation; state goes in a backing store (database, Redis). Where the lesson ends up. -> A.

## The Idea: scaling

- I1 Vertical scaling = bigger machine (cores, RAM, disks), "scaling up". Underrated: no code changes, no new failure modes; hundreds of cores and terabytes of RAM an API call away. Catches: ceiling, price per capacity rises near it, still one machine (reboot = down). -> A, intuition then name.
- I2 Horizontal scaling = more machines doing the same job, "scaling out". No ceiling in principle, cheap machines, one dying is partial loss. Catch: someone decides which copy gets each request; data in a copy's memory invisible to others. -> A.
- F1 Figure 001: left, small eight-core box becomes a big 192-core, two-terabyte box under a ceiling line, "still one box"; right, balancer over three app boxes each with "own heap", "add more as needed". -> A describes over-the-phone.
- I3 Do both in order: scale up until it hurts, then scale out the parts easy to copy; "easy to copy" = holds no state. -> A; B pushes ("isn't scaling out the grown-up answer?").

## The Idea: what a load balancer is

- I4 Load balancer: receives every request/connection, forwards to one of several backends, choosing each time; traffic cop; clients only know its address. -> A.
- I5 Backend = server behind it doing the work; also upstream (nginx's word), target, replica. -> A inline.
- I6 Two quieter questions: which backends alive now; how to retire one without dropping work. -> A signpost.
- F2 Figure 002: browser with cookie sid seven-f; request one POST login goes to app 1, whose memory now holds session "7f: user gaurav, cart gpu"; request two POST cart carries the same cookie, goes to app 2 with empty dict, 401 "who are you?"; app 3 empty too. "Same cookie, different heap." -> A as diagram over the phone.
- I7 Session = everything server remembers about one logged-in user between requests. Cookie = small string server asks browser to store and send back on every later request; here only a random session ID, the key into the dict. Cookie travels; the data it points to does not. -> A; B voices wrong model "doesn't the cookie carry my cart?"
- I8 State = any data a server keeps that a later request depends on. Test: kill and restart with nobody noticing -> no state. Includes sessions, in-memory caches, rate-limit counters, files on local disk, open WebSockets. -> A.
- I9 Two ways out: sticky session (session affinity; balancer routes every request from one user to the same backend, by hashing a cookie or IP) vs stateless server (keeps nothing between requests; everything in request or shared store like Redis/DB). Option 1 patch, option 2 fix. -> A; B naturally prefers sticky ("just pin me").

## The Idea: L4 vs L7

- I10 Request is a stack of envelopes: IP (addresses), TCP (ports, connection), usually TLS (encrypted), then HTTP (path, headers, cookies, prompt). Balancers named after how many envelopes they open, OSI numbering: layer 3 IP, layer 4 TCP/UDP, layer 7 application/HTTP. -> A, envelope image (exact).
- F3 Figure 003: row of boxes IP, TCP, TLS, HTTP (POST v1 chat, cookie), body (model, prompt); bracket over first two "L4 sees this"; bracket under all "L7 sees all of it after decrypting"; L4 one choice per connection, fast, NLB, Maglev, IPVS; L7 one choice per request, retries, cookies, nginx, Envoy, ALB. -> A.
- I11 L4 balancer: picks backend when TCP connection opens, shovels bytes without reading. AWS NLB, Google Maglev, Linux IPVS, HAProxy TCP mode. One choice per connection; fast, millions of packets/s, doesn't need TLS cert. Can't read cookie, can't tell healthz from a 30-second generation, can't retry (never sees where a request ends). -> A.
- I12 HTTP/2 and gRPC: many requests over one long-lived connection; behind L4 all a client's requests go where its one connection landed, forever; classic "gRPC load balancing doesn't work" complaint. -> B: "so what's the catch with fast?"; A.
- I13 L7 balancer: accepts client's connection, decrypts TLS, parses each HTTP request, opens/reuses its own connection to a backend of its choice. nginx, Envoy, HAProxy HTTP mode, AWS ALB. Really a reverse proxy (accepts requests on behalf of servers; "reverse" because it represents servers, normal proxy represents clients). Route by path, balance per request, add headers, retry on another backend. Costs more CPU per request, needs TLS keys. -> A.
- I14 Big systems use both: L4 at edge spreading connections over fleet of L7 proxies. nginx L7 in http block, L4 in stream block. -> A.

## The Idea: algorithms

- I15 Round robin: A, B, C, A, B, C; no information; fair by count; nginx default; nearly perfect if every request costs the same. -> A.
- I16 Random: fair on average, streaky (three in a row on one while another idles); worse than round robin for equal cost. -> A.
- I17 Least connections: send to backend with fewest requests in progress; balancer knows for free (forwarded, not heard back); first algorithm that reacts; stuck backend piles up connections, stops getting new ones. -> A.
- I18 Round robin fair by count not cost; LLM requests extreme: one-word classification vs 2,000-token essay, factor of a hundred; round robin gives A the next one even mid-essay; short requests behind long wait. -> A; B wrong model "round robin is fair, so it's fine".
- PR1 Predict: three servers, one at a time each, queue the rest (like one GPU running one batch); 90% short 40 ms, 10% long 1,000 ms; about 75% busy. Median under RR? LC? Answer: RR median 725 ms, LC 83 ms; p99 3.6 s -> 2.2 s. Short request only needs 40 ms, so 725 ms = mostly waiting behind a long one; LC steers short ones away from busy servers; tail improves less because balancer counts requests, not sizes. -> A asks, B guesses (too low/thinks small difference), A reveals with reasoning.
- F4 Figure 004 simulator: four servers, one request at a time; buttons round robin/random/least conn/two choices; LLM mix vs all same size; S1 half speed; load slider; live p50, p99, longest queue from last 600 finished; table re-runs 20,000 requests per algorithm. What you'd see: RR with LLM mix -> switch to LC, queues flatten; all same size, RR as good as anything (count is cost); S1 half speed with RR, S1's queue climbs off the top, numbers keep growing. -> A describes as "what you'd see as you click".
- I19 Slow server math: RR still sends S1 a quarter, but S1 has a seventh of capacity (half out of three and a half); more work than it can finish, queue grows without bound, a quarter of users wait forever; LC routes around. Degraded machines common (noisy neighbour, throttling GPU, cold cache); strongest argument for load-aware balancing. -> A works through it in words; B checks the seventh.
- I20 Power of two random choices: LC assumes one balancer with perfect current counts. Real systems: many balancers (nginx worker processes, dozens of proxy machines), partial stale view; all send to "least loaded" and pick the same one at once, flatten it. Herd effect: many independent deciders react to same signal at once, all pile onto same choice. -> A; B proposes "just share the counts".
- I21 Fix: pick two at random, send to the one with fewer connections. Cheap, constant cost. Math: n balls into n bins at random, fullest gets about log n over log log n; each ball picks emptier of two random bins, fullest drops to about log log n over log two. Exponential improvement. Azar, Broder, Karlin, Upfal proved; Mitzenmacher's thesis carried it to load balancing. Random picks so a hundred stale balancers don't converge on one victim. Envoy's "least request" uses it by default; nginx "random two least_conn". -> A, math in words with a worked example (a million bins: roughly eight to nine vs roughly four, my derivation, flag).
- I22 In the simulator two choices lands between random and LC because it models one balancer with perfect information; earns its place with many balancers and stale counts. -> A.
- I23 Weights: any can be weighted, e.g. weight two for the box with twice the GPUs. -> A one line.

## The Idea: hashing

- I24 Sometimes you want a key to always land on the same backend because it has something loaded (cache, model, shard). Obvious way: hash of key mod N. -> A.
- PR2 Predict: 60 users over 3 servers with hash mod 3, add a 4th, mod 4; what fraction move? Answer about 75%: stays only if mod 3 equals mod 4; of the 12 possible values of mod 12 only 3 (0, 1, 2) match. Reshuffles three quarters; if each held a warm cache, 75% cold at the moment you're adding capacity because overloaded. General N to N+1 moves about N over N+1. -> A asks, B guesses a quarter (natural wrong model: "only the new server's share moves"), A reveals.
- I25 Consistent hashing: Karger and colleagues at MIT, 1997, idea behind Akamai. Servers and keys on a circle by hashing; key belongs to first server clockwise; adding/removing only moves keys in its slice, about one over N. New server takes one arc, steals from one neighbour. -> A, picture the clock face.
- I26 One mark per server -> lumpy arcs; virtual nodes: many positions per server (say 100-200), smooths shares, bigger servers get more. -> A.
- F5 Figure 005 hash ring: slider servers two to eight; mode hash mod N vs hash ring; virtual nodes toggle; readouts keys that moved, ideal (one over new N), busiest server. What you'd see: mod N, one step moves most keys; ring, only the arc; one mark per server uneven busiest; virtual nodes even out. -> A.
- I27 nginx: hash with a variable plus "consistent" puts it on a ring ("ketama"). Maglev, an L4 balancer, uses its own consistent hashing so every Maglev machine independently picks the same backend for a connection. -> A.

## The Idea: LLM prefix routing

- I28 KV cache recap: keys and values for every prompt token kept on GPU so not recomputed per new token. Prefix caching (vLLM, SGLang): keep KV for prompts already processed so a new request starting with the same tokens skips recomputing. Chat resends whole conversation; agent resends system prompt and tools every step. -> A re-explains briefly.
- I29 Prefill: first phase, run whole prompt at once to build its KV cache; cost grows with prompt length; most of time-to-first-token. Illustrative: 10,000-token history at a few thousand tokens/s of prefill = seconds cold, well under a second if 9,800 cached. -> A, numbers said with "illustrative".
- I30 Eight replicas behind round robin: turn two has a 1-in-8 chance of finding turn one's KV; seven in eight recomputed, seven GPUs fill caches with copies. LC just as blind. -> A; B arrives at it.
- I31 Cache-aware routing (prefix-aware, KV-aware): route to replica most likely to hold prefix, still avoid overloaded. Simple: consistent-hash on conversation ID or first chunk of prompt. Better (SGLang router, similar ideas in NVIDIA Dynamo and llm-d): approximate tree of prefixes per replica, route to longest match, fall back to least-loaded when the match is too busy. Pure affinity recreates slow-server disaster: one popular system prompt, one melting GPU. -> A.
- I32 This is a sticky session and it's fine: KV cache is a cache; replica dies, next request elsewhere, prefix recomputed, user waits a bit longer, nothing lost. Stickiness for speed good; stickiness for correctness (only copy on one server) is the trap. The line to remember. -> B objects "you just said sticky is a trap"; A draws the line.

## The Idea: sticky trap

- I33 Five failures: server crashes (pinned users lose session mid-checkout); deploy (each restart a small crash on purpose, every deploy logs people out, team deploys less); scale (pinned users don't move, new server idles); lumpy load (one heavy user or one office behind one IP, balancer not allowed to help); quietly fragile (pin by session cookie, login request wasn't routed by it). Root cause: data has one copy in a place designed to be disposable. -> A as a run, B reacts to deploy one.

## The Idea: stateless + shared store

- I34 Move data to one shared place: Redis (in-memory key-value server, small commands over TCP like SET, GET, RPUSH, EXPIRE, answers well under a millisecond on local network; sessions, caches, rate limits, queues) for sessions, database for anything that must never be lost. Any server can look up the session ID; balancer sends anywhere; killing a server bothers nobody. -> A.
- I35 Cost: one network round trip per request, roughly 100-500 microseconds inside a data centre or between containers on one machine; under 1% of a 40 ms model call. -> A with comparison; B asks for the number (numbers gap).
- I36 Doesn't solve 1: moved the state, didn't remove it; Redis must not lose it, must not become the new single point of failure. -> A.
- I37 Doesn't solve 2: concurrency is back; two tabs add to cart at once on two servers; read, append, write back -> one item vanishes; lost update from the threads lesson across machines, no Python lock can help. Fix: one atomic step in the store (RPUSH appends in one command). Transactions lesson. -> A, re-explaining lost update.
- F6 Figure 006: clients, one address (virtual IP or DNS), LB A active and LB B standby, four app servers "no state" incl. app 3 draining and app 4 just added, all pointing down to Redis (sessions plus replica) and database (users plus replica); "state lives here and only here". Moved the single point of failure, so deal with it there. -> A.

## The Idea: health checks

- I37b Passive health check: judge from real traffic; failed forward counts a failure; after enough, stop using it a while. Open-source nginx: max_fails within fail_timeout (defaults one and ten seconds) benches for fail_timeout then retries. Free, but a real request had to fail first. -> A.
- I38 Active health check: probe on a timer (GET healthz every 5 s), remove after a few failures in a row, before a user hits it. HAProxy, Envoy, NGINX Plus, cloud balancers, Kubernetes probes. Detection time = interval times threshold: 5 s, 3 failures -> up to 15 s. -> A, multiply in words.
- I39 Shallow vs deep: shallow = process up and answering HTTP; deep = also reach Redis, DB, model. Deep dangerous: Redis hiccups two seconds, every backend fails at once, balancer removes all, blip becomes outage. Defence: failing open (all look unhealthy -> ignore checks, send to all; Envoy's panic threshold). Keep routing check about this process. -> B suggests deep check as the "thorough" option; A corrects.
- I40 Liveness vs readiness (Kubernetes): liveness = is this process stuck, restart if not live, fail only if can't recover; readiness = should it receive traffic now, fails during startup (model loading), draining, overloaded, removes from rotation without restart. LLM server loading weights two minutes: alive, not ready; confuse them and it restarts in a loop. -> A.

## The Idea: retries

- I41 nginx can't connect -> quietly tries next (proxy_next_upstream, on by default for errors and timeouts). If already sent and backend died mid-work, retry only safe if idempotent (twice same as once; GET, PUT, DELETE supposed to be; POST not, two POSTs to orders make two orders). nginx retries in-flight GETs elsewhere, not POSTs; POST whose backend died gets 502 Bad Gateway (504 is timeout version). Every LLM API (chat completions, messages) is a POST. -> A; B: "why not just retry everything?"

## The Idea: draining

- I42 Draining (Google SRE "lame duck"): stop new requests, let in-flight finish, then shut down. Four steps: stop being chosen (readiness fails or deregister); wait for balancer to notice, still serving; finish in-flight with deadline longer than longest request (minutes for LLM streaming); exit. -> A.
- I43 SIGTERM: polite shut down, catchable; grace period ten seconds for docker stop, thirty in Kubernetes, then SIGKILL which can't be caught. Uvicorn catches SIGTERM, stops accepting, finishes in-flight, exits. kill -9 = SIGKILL, everything in flight dies. Kubernetes subtlety: SIGTERM and removal from balancer happen at the same time, so new requests arrive at a process that stopped accepting; fix: preStop sleep of a few seconds. -> A.

## The Idea: SPOFs

- I44 Single point of failure: one component whose failure takes the whole system down; anything there's exactly one of in every request's path. Finger on each box: if this dies, does everything stop? -> A.
- I45 Build has two: nginx and Redis. Fixes: two balancers sharing a virtual IP the standby takes over (VRRP, usually keepalived), several balancer IPs in DNS, or a cloud balancer (itself a hidden fleet); replicated Redis with failover. Always another (DNS, region, config push to every balancer). Goal isn't zero; know where they are. -> A; B spots the irony.

## Build It

- B0 Setup: one folder, three copies of a small FastAPI app behind nginx; app pretends to be LLM server: generate endpoint holds a one-at-a-time lock (like a GPU running one batch), "generates" 2 ms per token; sessions deliberately in a dict; healthz reports in-flight count. Verified natively on a Mac with Homebrew nginx and three uvicorns; compose files standard but untested. Curl healthz four times: app1, app2, app3, app1. The zone line: nginx runs several workers; without a shared zone each keeps own counts, so least_conn means least this worker knows about. -> A, one stretch.
- B1 Task: log in, six cart calls with a cookie jar. PR3 Predict: how many of six succeed? Answer two; login on app2, cart calls app3, app1, app2, app3, app1, app2; cart ends gpu3 and gpu6; other four 401 from empty dict; nginx didn't retry because a 401 is a valid answer from a healthy backend. -> A asks, B guesses, reveal.
- B2 Task: sticky with hash on the session cookie, consistent; fails for most users. Why: the login request carried no session cookie yet (it's what creates it), so login was routed by an empty value and lands somewhere else than the later requests. Fix: client sends a uid cookie with the username from the first request; hash on that; every cart fills. Then the trap: kill the pinned backend, request cart -> 401 from a different backend, cart gone; start it again -> still gone (fresh process, empty dict). -> B works out the one-sentence answer; A confirms. (Restart-still-gone: implied by in-memory dict; say plainly.)
- B3 Task: sessions in Redis; remove hash line; SESSIONS dict disappears. Shape: load, create, add-to-cart atomically. User under a sess key with expiry (an hour TTL), cart as a Redis list (RPUSH, LRANGE, EXPIRE); one command append so concurrent appends can't lose items. Tempting alternative JSON blob read-modify-write is Break It two. Endpoints plain def so FastAPI runs them in thread pool; sync client fine. Result: all six succeed while served_by rotates; kill a backend, nothing lost; agent review for read-then-write split. -> A.
- B4 Task: load generator, open loop (fire on schedule whether earlier finished, like real users); closed loop slows when server does and hides queueing = coordinated omission (p99 lesson). 90% 20 tokens, 10% 500 tokens; exponential gaps; create task per request, gather at end; print p50/p90/p99/max and status/served_by counts. Mean cost 0.9 x 40 + 0.1 x 1000 = 136 ms; three backends top out near 22/s; start at 16. -> A, arithmetic in words; re-explain coordinated omission.
- B5 Task: compare RR, least_conn, random two least_conn at 16/s for 40 s; then push to 19 and 21 for RR and LC; which falls apart first (RR). -> A.
- B6 Task: kill backend under load (14/s, kill at five seconds, start after seven); then six long POSTs with kill; repeat with stop (SIGTERM, ten-second grace), then GET. Docker caveats: killed container's IP disappears, may get "host unreachable" or the one-second connect timeout; restarted container may get new IP nginx won't see until reload. -> A, short.

## Measure

- M1 Setup: native on M-series MacBook, one nginx worker, 16/s for 40 s, about 650 requests per run; shape should match. -> A.
- M2 RR p50 725, p90 1,948, p99 3,569 ms; LC 83 / 1,520 / 2,238; two choices 137 / 1,581 / 2,517. -> A says key numbers in words, not as a table.
- M3 RR median terrible: short needs 40 ms, median 725, mostly waiting behind 1 s request; RR split counts perfectly 218, 218, 217: even counts, uneven work. -> A.
- M4 LC fixes median, helps tail less: long requests take a second themselves and bunch up; counts requests not tokens; routers knowing prompt length or engine queue depth can do better. -> A.
- M5 Two choices in between: one balancer with perfect counts does best checking all; two choices pays off with many stale balancers. -> A.
- M6 Utilization: 16 per second times 136 ms = 2.2 of 3 busy, about 73%; at 21/s 95%, waiting explodes (the knee from p99 lesson); RR hits wall first because it can leave a backend idle while another has a queue. -> A, re-explain knee briefly.
- M7 Failure table: in-memory RR 2x200, 4x401; sticky on sid, 5 of 6 users' first cart call 401; sticky on uid kill pinned -> 401 from different backend; 6 long POSTs SIGKILL -> 4x200, 2x502; SIGTERM -> 6x200; 14/s SIGKILL 7 s -> 0 errors (backend idle at the instant; try a few times). -> A walks through as story.
- M8 Why SIGKILL POST two 502s: two requests on app2 (one running, one queued) died; sent, POST not idempotent, no retry. With GET nginx retried: log "upstream prematurely closed connection", every client still 200. -> A.
- M9 SIGTERM all 200: uvicorn stopped accepting but finished both; a new request to app2 got connection refused, never-established connection always safe to retry, nginx sent elsewhere. -> A.
- M10 The 14/s run: depends what the backend was doing at that instant; one clean failure test proves little. -> A.
- M11 Price of statelessness: time a few hundred GET cart calls in-memory vs Redis; expect a fraction of a millisecond difference (approximate, measure) vs 40-1,000 ms for generate. -> A.

## Break It

- K1 Pin by IP (ip_hash): everything lands on one backend because all your traffic comes from one address (your Mac or Docker's gateway); real world: whole company behind one NAT address. Sticky-by-IP balances addresses, and addresses aren't users. -> "what if" exchange; explain NAT plainly.
- K2 JSON blob read-modify-write, 50 concurrent cart posts: fewer than 50 items (lost update across containers); RPUSH exactly 50. Redis also has WATCH/MULTI and Lua scripts for multi-step atomic updates. -> exchange.
- K3 Kill the only balancer: total outage with three healthy app servers. Kill Redis: every server up, every request failing. Making healthz check Redis just turns second into "nginx thinks every backend is dead". -> exchange.
- K4 Drain too fast: graceful shutdown timeout one second; uvicorn waits a second then cancels running request: client got 500, log "Cancel 1 running task(s), timeout graceful shutdown exceeded". docker stop with one-second timeout: SIGKILL arrives, 502s. Grace must outlast longest request; LLM generations run minutes. -> exchange.

## Explain It Back (substance must appear)

- E1 Three copies in-memory: separate processes, separate memory, stranger elsewhere; sticky vs stateless; pick stateless because sticky's only copy lives on a disposable server (crashes/deploys log out, new servers don't pick up users, lumpy); stickiness fine only as speed optimization on shared state, like warm KV cache. -> Ending restatement + I32/I33.
- E2 RR bad for LLM fleet: fair by count, costs vary 100x+, short queue behind long (725 vs 83); can't route around degraded replica (unbounded queue); better: least outstanding requests, or two choices with many stale balancers; best: cache-aware with fallback to least-loaded, ideally using engine's own signals (queue depth, KV cache usage) not connection counts. -> I31 + M4; mention engine signals.
- E3 Scale: 200/s per server, need 5,000 -> 25 servers plus headroom (30-35) to lose a few and still deploy; one nginx proxies well beyond 5,000 simple req/s but want two; shared stores stop being linear; 5,000 session reads/s comfortable for one Redis (simple ops on the order of 100,000/s per instance, measure); database usually the real limit -> caching, read replicas, sharding with consistent hashing; one extra Redis round trip nothing, ten in series isn't. -> Own exchange near the end, B asks "how does this scale" as real interviewer worry.
- E4 Deploy without dropping: drain (fail readiness/deregister, keep serving until balancers notice, preStop sleep since SIGTERM and endpoint removal race, finish with deadline longer than longest request, exit before SIGKILL); roll a few at a time; balancer can retry connection failures and idempotent requests; POSTs need idempotency keys. -> In draining/retries sections; idempotency keys added.
- E5 Health check 5 s x 3: up to about 15 s still gets share, fails unless retried; add passive checks (bench on first failed connection); shorter interval faster but more probes and false alarms; keep shallow; fail open. -> In health check section.

## Go Deeper / Connections

- G1 Best sources: Google SRE book chapters on load balancing at frontend and in datacenter; Twelve-Factor App factor six. -> one closing-ish sentence before final exchange.
- C1 Sets up rate limits and backpressure (when even LC can't keep up). -> one sentence.

## Flow

Problem scene (B gets it right) -> Origin -> scale up vs out -> what a balancer is, cart diagram, session/cookie/state -> sticky vs stateless as two exits -> L4/L7 -> algorithms with predict and simulator -> two choices -> hashing predict and ring -> LLM prefix routing (the twist: good stickiness) -> sticky trap list -> shared store, round trip cost, lost update -> fleet figure -> health checks -> retries/POST -> draining/SIGTERM -> SPOFs -> Build It walk-through with predicts -> Measure numbers -> Break It -> scaling question -> pointer to sources/rate limits -> B restates, A sharpens, stop.
