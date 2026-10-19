# Outline: design-docs (story-first)

Source: src/lessons/design-docs.mdx. Curriculum: "Writing a design doc." How do engineers decide on
a design before building it, in writing?

## The one big idea

The expensive decisions happen before the code, and paper is the cheapest place to find out you're
wrong. Writing forces the numbers that code lets you skip ("every thousand steps" runs fine and
hides that the thousand was a guess). Shown through the doc the job posting names: keeping a
thousand-GPU training run alive when machines die.

## Opening scene

Two scenes. A research engineer posting at an AI lab: "writing a design doc for fault-tolerant
strategies". Writing, not implementing. And his desk at a startup: nobody hands you a spec, you
build it your way, it works, and a voice says "my way is probably not the best way, and I'd never
know". Code review renames a variable; it never says the cache layer was the wrong idea.

## Wrong mental model B voices

"A design doc is documentation, you write it after." Later, in the fault-tolerance story: using
one server's failure rate for the whole job ("servers almost never die") and "just checkpoint
every so often, it's fine".

## Story beats

1. The two scenes are the same problem: approach decided before code, never reviewed.
2. Origin: nineteen sixty-nine, grad students building the ARPANET, nobody in charge, afraid to
   sound like they're giving orders. Steve Crocker calls the notes "Request for Comments". Every
   internet protocol since was settled that way.
3. Three jobs of a doc: thinking, agreeing, remembering. Written after the code, it only does the
   third. One-way doors vs two-way doors as the test for when to bother.
4. The posting's doc, part one: failures add up. One server feels immortal; a job that needs all of
   a few thousand fails every few hours. B uses the per-server number; that's the most common error
   and it costs about half the month.
5. Part two: how often to save. Saving costs time; not saving loses work. Balance them; the answer
   moves with a square root. The curve is flat on top, so be in the right range and stop
   agonising; the real wins are cheaper saves (save in the background) and faster restarts
   (notice fast, spare machine warmed up, copy in a neighbour's memory).
6. Part three: failures that don't crash. Chips that quietly compute wrong answers; the damage
   spreads to every copy; so keep old checkpoints too.
7. Writing it so people read it: the summary decides; numbers over adjectives; alternatives with
   honest costs, and the cheapest step first.
8. Review: a comment that kills your proposal and replaces it with a better one is the doc working,
   at the cheapest possible moment. That's the answer to the startup voice.

## Numbers worth saying

- A thousand GPUs.
- Every few hours at the biggest scale (Llama three's run).
- Using the wrong failure rate costs about half the month.

## Left to the written lesson

The Young/Daly formula and its derivation, the goodput ladder and every percentage, GPU-hour and
dollar figures, the Llama three interruption counts, checkpoint size and bandwidths, PCIe and
storage numbers, NCCL timeout, the tier figure, elastic training and rendezvous, gradient
accumulation, straggler policy detail, the doc template, the example summary and alternatives
table, RFC vs ADR detail, simulator code, Measure tables, Break It, Explain It Back.
