# Outline: url-shortener

Source: src/lessons/url-shortener.mdx. Curriculum: "Build a URL shortener." Question: what does it
take to design, build, ship and scale the classic interview system, with a coding agent at your side?
Why: the most common "design and build" interview; every earlier Scale lesson shows up in it once.

## The one big idea

The whole system is one table (short code to long URL) and two operations on it, and every
interview question is about one arrow in that picture. The agent can type all of it; what's being
tested is whether you decided the behaviour before the prompt and understand every line after. The
two decisions that actually change the product both come from the same question: who has to wait
for what. The browser waits for one header, so the redirect must be quick and must keep coming back
to you if you want to count; nobody waits for the click to be written down, so that goes behind the
redirect on a queue.

## Opening scene

A candidate in an AI-assisted interview: "build a URL shortener with a coding agent, explain it,
productionize it." Types the problem into the agent, a tidy app in about a minute, one happy click,
"it works." Then the interviewer's questions, each answer thinner. B sat in on a friend's interview
like this (the real seed, kept anonymous) and admits the answers he'd have given.

## Wrong mental models B voices (Gaurav's actual answers)

1. "A 302 is a kind of rewrite." A: a rewrite happens inside one server and the client never knows;
   a redirect tells the browser to go make a fresh request somewhere else, and a shortener has to
   redirect because the target is someone else's site.
2. "The table maps a URL to a URL." A: close, but it maps a short code to a long URL, and that's the
   key you look up on every click.
3. "Put Kafka or SQS in front as a load balancer, so if a container goes down the queue still
   processes the request." A: a redirect is synchronous, a queue is for work nobody waits for, and
   the worker can't answer a browser connection it doesn't hold. Surviving a dead server is the load
   balancer's job (health checks, draining). The queue belongs behind the redirect, for click events.

## Story beats

1. The interview scene. The library picked the status code (307), nobody decided it. Nobody knew
   what happens when two people shorten the same link at once. It was on localhost. B confesses his
   answers.
2. One table, two operations. Code to long URL (correct B's "URL to URL"). Shortening is a rare
   write, following is the read on every click. The redirect is a tiny answer with a Location
   header; the browser makes the second request itself and your server never sees it. Redirect vs
   rewrite (correct B).
3. 301 versus 302 is about whether the browser comes back to you. A bare 301 may be kept as long as
   the browser likes: clicks stop reaching you, edits never reach that visitor, and switching back to
   302 doesn't help a browser that isn't asking. Two honest ways out: send a 302, or send a 301 with a
   short caching instruction. The big public shorteners do the second. The status says what it
   means, the caching header says how long anyone may remember it.
4. Think before you prompt. Five minutes of decisions written as a spec, which is the design
   discussion the interviewer wants. The duplicate race: check-then-insert crashes with twenty
   threads; a unique constraint in the database is the referee. Ask the agent to say which decisions
   it made that you didn't specify. Read every line; you can only explain it if you read it.
5. Making it public. A tunnel gives a laptop a public address for minutes. The gotcha: the app
   builds links from its base address. The moment it's public, the question becomes who's using it:
   a free way to hide where a link goes is exactly what phishing wants.
6. Productionizing starts with a number, not boxes. Read-heavy: created once, clicked many times.
   One Python process handles a few hundred redirects a second, so the peak needs dozens of
   identical stateless processes behind a load balancer. Cache the hot codes: the mapping almost
   never changes, so invalidation is easy. Aside: on the laptop the cache made it slower, because a
   cache only pays when a hit is much cheaper than a miss.
7. Where the queue goes (B's Kafka answer). Why it can't work in front. What a dying container
   actually needs: the load balancer, health checks, draining; one process restarted alone always
   has a gap. The queue behind the redirect for click events. The slow analytics experiment: inline,
   redirects collapsed while the database they needed was fine; queued, they didn't notice.
   Counting can be approximate, redirecting can't be slow. The edge cache is the same trade as 301
   versus 302, one layer further out.
8. Ending. B restates; A sharpens: the deciding question isn't "which box" but "who is waiting for
   this, and do I need them to come back."

## Numbers worth saying

About a minute for the agent; twenty threads for the race; about a hundred clicks per link (said as
an assumption); a few hundred redirects a second per process; thirty thousand a second at peak
against a few hundred writes (one contrast, said once); redirects went from about two milliseconds
to almost two seconds with the slow inline write.

## Left to the written lesson

The full estimate table and storage sizes, code length and collision math, counters vs random codes
and Snowflake, sequential-code walking, replicas and replication lag, Postgres vs SQLite, the Redis
sizing, rate limits and destination checks in detail, transactions, the tunnel's forwarded-address
detail, the Measure tables, the ninety-second explanation word for word, and Go Deeper.
