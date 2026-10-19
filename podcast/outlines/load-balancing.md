# Outline: load-balancing

Source: src/lessons/load-balancing.mdx. Curriculum: "Load balancers and state."

## The one big idea

The moment you run more than one copy of a server, anything a copy remembers in its own memory stops
being shared. The fix is to make the copies forget and keep state in one shared store. Sending a user
back to the same copy is fine when it's for speed (a cache you can lose) and a trap when it's for
correctness (the only copy of the data).

## Opening scene

His FastAPI app keeps sessions in a Python dict. Three copies behind a load balancer. Log in, next
click says "who are you?", refresh and it knows you, refresh again and you're gone.

## Wrong mental models B voices

The diagnostic says he got the load-balancer state problem right, so B gets the first part fast
("three processes, three separate memories") and then reaches for the natural patch: "so just pin
each user to one server." Second wrong model: "round robin is fair, everyone gets the same share."

## Story beats

1. The vanishing login. B diagnoses it immediately (separate processes can't see each other's
   memory). A: the interesting part is what comes after.
2. History: NCSA in the nineties, DNS handing out addresses in rotation; dead servers kept getting
   visitors and returning users couldn't get back to the same machine; load balancer boxes appear and
   can pin users. Then Heroku's Twelve-Factor App: processes stateless, sticky sessions named as a
   violation.
3. Why pinning is a trap: crash logs people out, every deploy is a small crash, new servers idle,
   one heavy user or one office behind one address pins load. Same root cause: one copy of the data
   in a place designed to be disposable.
4. The fix: stateless servers, sessions in Redis or a database. Costs one quick trip across the
   network, tiny next to a model call. But you moved state, you didn't remove it: the store must not
   be lost, and two tabs adding to a cart at once can lose an item, the lost update from the threads
   lesson, now across machines. Fix: make it one step inside the store.
5. Choosing who gets a request. Round robin is fair by count, not by cost. LLM requests vary
   hugely: a quick question waits behind an essay. Least connections reacts. Laptop insight: the
   typical short request went from waiting most of a second to almost nothing. A half-speed server
   under round robin gets a queue that never stops growing.
6. Many balancers with stale counts all pick the same "least busy" server: herd effect. Power of two
   choices: look at two random servers, pick the less busy. One extra look gets most of the benefit.
7. When you want the same server: hashing. Hash mod the number of servers reshuffles most users when
   you add one. Consistent hashing on a ring moves only one slice.
8. LLM twist: prefix caching. A chat resends its whole history each turn; the GPU that already has it
   skips most of the prompt reading. Cache-aware routing, with a fallback to the least busy replica.
   This is a sticky session and it's fine, because the KV cache is a cache. Stickiness for speed
   good, for correctness a trap.
9. Briefly, leaving gracefully: draining, finish in-flight work before exiting; LLM POSTs can't be
   safely retried by the balancer. And single points of failure: one balancer, one Redis.
10. Ending: B restates; A sharpens the speed-versus-correctness line.

## Numbers worth saying (three)

- Three copies.
- Adding a fourth server with simple hashing moves about three quarters of users.
- Typical short request: most of a second to almost nothing (relationship, not values).

## Left to the written lesson

L4 versus L7 details and gRPC, OSI layers, nginx config and directives, the simulator, the hash ring
figure, the balls-in-bins math, health check intervals and liveness versus readiness detail,
SIGTERM grace periods and preStop, idempotency and status codes in detail, all Build tasks and code,
the Measure tables, Break It specifics (ip hash, JSON blob race, drain too fast), Explain It Back
scaling numbers, Go Deeper.
