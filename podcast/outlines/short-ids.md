# Outline: short-ids

Source: src/lessons/short-ids.mdx. Curriculum: "Short IDs and collisions." How do you hand out
short, unique IDs, and why do random ones collide so much sooner than you expect?

## The one big idea

Random codes clash far sooner than the size of the space suggests, because the chances grow with
the number of pairs, not the number of codes. But any single new code is almost never taken. Both
are true at once, and together they say where uniqueness has to come from: not from your code
checking first, but from the database refusing duplicates. Insert, and let it say no.

## Opening scene

A friend's interview: "build a URL shortener with Claude Code, then make it production-ready."
The agent's version works in ten minutes: six characters of base64, check whether the code exists,
try once more if it does, insert. Then the interviewer's questions each land on a different crack.

## Wrong mental models B voices

1. "Just use base64, it's the standard way to turn bytes into text."
2. "Sixty-nine billion codes, random picks, they'll basically never collide."
3. "Check if the code exists, then insert. That's what anyone would write."

## Story beats

1. The interview and the agent's code, told as a scene. The interviewer's questions.
2. Base64 in a URL: the slash splits the path, the plus turns into a space. Base64url fixes that
   and is fine for long tokens, but for short human codes people use just the ten digits and both
   cases of letters. Counting in base sixty-two is counting in base ten with more symbols.
3. TinyURL, two thousand two: a short link is just a row. The only interesting decision is the
   code. Three ways to pick: count up (never clashes, shortest, but anyone can walk it and read your
   volume; the German tank problem), pick at random, or hash the URL (clashes just like random, and
   dedup needs an index on the URL anyway, and customers want their own links).
4. B: "random from a huge space never collides." The agent's codes: first clash after about three
   hundred thousand. The birthday room: twenty-three people. Pairs grow as the square, so clashes
   arrive around the square root of the space. Half the bits. The spread: one run clashed after
   about a hundred draws out of fifteen million. Your service is one run.
5. The rescue: "has any pair ever clashed" versus "is my new code taken". The second is just how
   full the space is. Tiny until the space is a real fraction full, then a wall. Same number upside
   down is how often a stranger guessing codes finds a real link.
6. B: "check, then insert." The gap between the check and the write; the same bug as two
   requests both checking a limit in transactions. Hammering a table from eight processes: silent
   duplicates every run. The fix: a unique index, the B-tree from indexes that refuses a second
   copy, doing find-and-write as one step. Insert and catch the conflict, draw again. Also one
   round trip, and it's the index redirects needed anyway. Side note: workers seeded from the clock
   draw the same codes in lockstep.
7. Many servers: one counter is a bottleneck and a single point of failure. Hand out blocks
   (Flickr's odd and even ticket servers). The Twitpocalypse and Snowflake: time, machine number,
   small counter; no talking while running; sorts by time; breaks on a reused machine number or a
   clock jumping back.
8. UUIDs: so big nobody checks. Version four is random and scatters inserts across the B-tree;
   version seven puts time first. Many systems use both: a real internal key and a short code for
   humans.

Ending: B says it back as "clashes are rare, so the unique index is a safety net." A sharpens: a
clash somewhere is certain; the index is where uniqueness comes from, and what you watch is how
full the space is.

## Numbers worth saying (five or so)

- Sixty-nine billion codes, first clash around three hundred thousand.
- Twenty-three people in the room.
- One run clashing after about a hundred draws out of fifteen million.
- About one in thirty-five thousand: the chance a new code is taken at a hundred million links.
- UUID version seven inserts about thirteen times faster than version four on my Mac.

## Left to the written lesson

The base62 division ladder and code, the length table and bits per character, base58, the exact
birthday formulas and constants, the Measure tables, the one over one minus f formula, Postgres
ON CONFLICT details, the block-allocator SQL, Snowflake bit widths, Instagram's split, the
JavaScript big-number bug, leading zeros, the Feistel scramble and Sqids, the scaling question,
and all of Go Deeper.
