# Coverage: design-docs

Every outline item in podcast/outlines/design-docs.md, mapped to where it lands in the script.
Numbers checked against src/lessons/design-docs.mdx.

| Item | Where in script (quoted) |
|---|---|
| T1 prereqs re-explained | "Quick reminder of why. With data parallelism, every GPU has a full copy..."; "all this back-of-envelope stuff pays off" |
| T2 time estimate | "maybe one evening for the reading and the simulator, a second evening for the doc, and then a week of calendar time" |
| P1 job posting | "writing a design doc for fault-tolerant strategies. Writing. Not implementing." |
| P2 startup scene | B: "the ranker needs to be faster ... my way's probably not the best way. And I'd never find out." |
| P3 approach vs code review | "Nobody reviewed the approach ... They will not tell you the whole cache layer was the wrong idea." |
| P4 same problem | "the only cheap place to find out you're wrong is on paper" |
| P5 doc forces numbers | "you can't write the requirements section of a doc without putting a number there" |
| P6 two things | "The document itself ... And the content of that posting's doc" |
| O1 ARPANET, four universities | "a handful of graduate students at four universities. And nobody's in charge." |
| O2 Crocker, April 1969, RFC 1 | "Steve Crocker ... in April sixty-nine ... R F C one described the software on the host computers" |
| O3 protocols since | "T C P, H T T P, all of them, got settled the same way" |
| O4 link to startup, names | B: "That's ... my startup"; "Design docs, six-pagers, R F Cs, peps" |
| D1 definition | "A design doc is a short document you write before building something non-trivial" |
| D2 three jobs | "it does three jobs. They're different jobs" |
| D3 thinking | "every blank minutes, because blank ... it hides the fact that a thousand was a guess" |
| D4 agreement | "The infra person whose storage you're about to hammer. The researcher ... The manager" |
| D5 record | "why do we checkpoint every eight minutes and keep twenty copies? ... ask Gaurav" |
| D6 written-after failure | B: "the thing you write at the end"; A: "That's documentation ... it can't change anything" |
| D7 one-way doors | "Jeff Bezos split decisions into one-way doors and two-way doors ... three weeks in" |
| D8 rule of thumb | "more than a week to build, or it touches someone else's system, or ... painful to undo" |
| S1 converge | "There's no official format. But good docs end up with the same parts" |
| F1 anatomy figure | "At the very top, a summary. Five lines ... who might."; "Almost everyone reads the top ... Only the reviewers read all of it" |
| S2 non-goals | "surviving the loss of the whole storage cluster ... considered and accepted. Not forgotten." |
| S3 requirements with numbers | "under five minutes, and keep at least ninety-five percent goodput" |
| S4 alternatives | "alternative B is better than you think. You only get that comment if B is on the page" |
| S5 failure modes | "what happens when the checkpointing system fails?" |
| S6 open questions | "one point one terabytes every ten minutes. Storage team, can it?" |
| S7 signpost | "How often do things break?" |
| R1 chain / all-reduce | B: "a single GPU server is pretty reliable"; A: "It's a chain" |
| R2 MTBF | "M T B F, mean time between failures ... a lot sooner or a lot later" |
| R3 divide by K | "fails that many days divided by the number of machines. Because failures add up." |
| PR1 predict | "about two ... About an eighth of a day. Roughly three hours." |
| R4 Llama 3 numbers | "fifty-four day ... four hundred sixty-six ... Forty-seven ... Four hundred nineteen ... seventy-eight percent ... seven point eight a day" |
| R5 caveats, Kokolis | "An interruption includes software bugs ... several times worse ... Kokolis and others, twenty twenty-four" |
| F2 failures-add-up figure | "four bars on a log scale ... sixteen days ... about three hours, that's Llama three scale" |
| R6 planning MTBF 12 h | "about fifty hours ... Twelve hours ... four times worse ... meet its goals at six hours, and get better at fifty" |
| R7 memoryless | "the chance of failing in the next minute doesn't depend on how long it's been ... exponential distribution ... Failures cluster" |
| F3 one-failure figure | "Let's slow one failure way down ... Replace the machine. Load the checkpoint back. Warm everything back up." |
| G1 four buckets, half an interval | "Kept work ... Checkpointing ... Lost work ... restarting ... Call that R"; "each failure loses, on average, half an interval" |
| G2 goodput | "A job can be running at a hundred percent throughput and have eighty percent goodput" |
| G3 money | "seven hundred thirty-seven thousand GPU hours ... seventy-four hundred ... twenty thousand dollars ... seven hours of calendar delay" |
| C1 tension | B: "checkpoint as often as you can?"; A: "saving isn't free" |
| C2 insurance | "Each checkpoint is a premium you pay ... safe, but broke" |
| C3 derivation in words | "C divided by the interval ... half the interval divided by M ... smallest right where they're equal" |
| C4 formula, Young/Daly | "multiply it by the M T B F, double that, and take the square root ... R over M ... doesn't touch that term" |
| O5 1974 origin | "John Young at I B M ... nineteen seventy-four ... John Daly ... Los Alamos ... minus C" |
| PR2 predict 38 vs 3 h | "Thirty-eight? ... half a percent ... twelve and a half ... ninety-one point oh and eighty-three point nine ... fifty thousand GPU hours" |
| F4 interactive | "seventy-two hours of one simulated run ... a simulated year ... dashed line ... sliders ... the whole curve lifts" |
| C5 four things | "ninety-two point nine ... ninety-one point eight ... ninety-one point six"; "a hundred times cheaper ... ten times shorter"; "restart slice doesn't care"; "cheaper checkpoints help twice" |
| K1 checkpoint contents, 1.1 TB | "weights, the optimizer state ... sixteen bytes per parameter ... one point one terabytes" |
| K2 sharded | "every GPU writes only its own slice ... twenty gigabytes a second ... fifty-five seconds" |
| K3 async | B: "async means training never stops at all?"; "P C I express gen five ... sixty-four gigabytes a second each way" |
| K4 C = 3 s | "about eight and a half minutes ... from about five percent to about one point two" |
| K5 async catches, 2 GB/s | "Fifty-five seconds of writing inside an eight and a half minute interval ... lose up to two intervals ... two gigabytes a second" |
| K6 in-memory, Gemini 85 to 97 | "four hundred gigabit-a-second ... eighty-five percent to ninety-seven" |
| F5 tiers figure | "a ladder of four places a checkpoint can live ... restores from the fastest tier that survived" |
| RS1 restart is 4% | "thirty out of seven twenty, about four percent ... Detect, replace, reload, warm up" |
| RS2 detect, NCCL, heartbeat | B: "the job just crashes with an error"; "N C C L ... Ten minutes ... heartbeat ... MegaScale" |
| RS3 hot spare | "two to four spares costs one and a half to three percent" |
| RS4 reload | "about a minute ... Often slower ... From the in-memory copies, seconds" |
| RS5 warm up | "setting up N C C L across a thousand twenty-four GPUs isn't instant ... jump straight to a position" |
| RS6 elastic, torchrun, rendezvous | "torch run ... rendezvous ... rank zero, rank one" |
| RS7 elastic catches | B: "strictly better"; "gradient accumulation ... group of eight or sixteen GPUs has to go" |
| Q1 quiet failures | "The scary ones are quiet." |
| Q2 SDC | "A bit flips in a multiply ... Meta and Google ... twenty twenty-one ... replaying training steps deterministically" |
| Q3 loss spikes, PaLM, OPT | "a hundred steps before the spike, and skip a few hundred batches ... dozens of restarts" |
| Q4 stragglers | "twenty percent slow ... thermal throttling ... swap in a spare" |
| Q5 retention | "unnoticed for two hours has already overwritten every good copy ... one every few hours, kept for days" |
| W1 nobody reads past top | "most people won't ... they decide from the top of the page" |
| W2 summary example | "about every ten minutes ... about ninety-eight percent, versus about eighty-four ... a hundred thousand GPU hours ... one point six percent ... Friday" |
| W3 numbers over adjectives | "Training pauses about three seconds per checkpoint ... unknown, see open question two" |
| W4 diagram, node 37 | "when node thirty-seven dies. If you can't draw it, the design isn't finished." |
| W5 short, six-pager | "Two to three pages ... Length is easy. Choosing what matters is the work." |
| W6 alternatives table | "about eighty-four ... hundred nineteen thousand ... ninety-one ... ninety-five ... ninety-seven and a half ... ninety-eight point four ... Elastic ... Revisit at ten times the scale" |
| W7 what the table does | "the first and cheapest step ... gets half the gain" |
| V1 who to send to | "Someone who runs the storage. Someone who's babysat a big run ... vague thoughts" |
| V2 sorting comments | "This fact is wrong ... missing a requirement ... I prefer ... taste"; B: "I'd do it differently?" |
| V3 two habits, ego | "change the doc, not just the comment thread ... the doc succeeding, at the cheapest possible moment" |
| V4 recorded decision | "Decided October twentieth: going with option five" |
| L1 RFC | "a design doc with a process wrapped around it ... Rust's R F Cs and Python's peps" |
| L2 ADR | "Michael Nygard's template from twenty eleven has five parts ... A D R seven" |
| L3 progression | "an A D R for a decision you could reverse ... a folder of A D Rs" |
| B0 theory checker | "thirty-seven point nine ... thirty-six point nine ... point nine two eight seven" |
| B1 simulator | "One time through the loop is one interval ... a small loop inside the big one ... draw a fresh random time ... Assert that"; sanity checks |
| B2 sweep | "about a hundred intervals ... half a minute to a thousand minutes ... a hundred thousand minutes ... four or more ... By ten, twenty percent" |
| B3 realistic sim, ladder | "ten to detect, twelve to replace, three to reload, five to warm up ... six hours and at fifty hours ... measure the real restart time on day one" |
| B4 the doc and agent review | "Fault tolerance for a thirty-day pre-training run ... node thirty-seven ... skeptical senior infrastructure engineer" |
| B5 second doc | "cross-encoder ranker ... eval pipeline ... queries per second, p ninety-nine ... No agent for this one ... three lines at the bottom" |
| B6 done when | "you're done when your simulator matches the theory to within about half a percentage point" |
| M1 Measure rows | "thirty-seven point nine ... ninety-two point nine"; "nineteen minutes, Daly eighteen ... eighty-two point six"; "Seventy-seven and a half ... ninety-seven"; "eight point four, ninety-six point eight"; "sixty-five point seven ... sixty-two point seven ... eighty-eight point seven" |
| M2 author's run | "four seeds, two hundred thousand minutes ... thirty-seven minutes ... seven point three" |
| M3 wobble | B: "That really does sound like a bug."; "which interval wins is mostly luck" |
| M4 root twenty | B: "cuts ... by twenty times"; "the square root of twenty, about four and a half times" |
| M5 ladder | "Eighty-three point nine ... a hundred nineteen thousand ... sixty-seven ... thirty-eight ... nineteen ... twelve ... fifty-two thousand GPU hours ... more than ninety percent ... ninety-seven" |
| K-1 per-server MTBF | B makes the mistake aloud; "fourteen and a half hours ... about forty-nine percent ... five seconds" |
| K-2 clustering | "thirty percent chance ... twenty minutes ... burn-in test" |
| K-3 corruption, retention | "once every seven days ... thirty minutes, then six hours ... last twenty plus one every six hours" |
| K-4 no summary | "Delete your summary ... Count how many questions" |
| E1 why doc before code | Problem section, D6, V3, and the ending exchange |
| E2 derivation in words | C3, C4, PR2, C5 |
| E3 scaling ten times | "seventy-two minutes ... three point two ... full ten times ... fifty-five percent ... ninety-two" |
| E4 goodput vs throughput / failure count | "Failure count tells you nothing about what each failure cost ... halves the failures but doubles the restart time" |
| E5 every hundred steps | "a step's four seconds ... seven minutes ... thirteen percent ... only right relative to C and M ... I change the doc" |
| G-1 Go Deeper | "Malte Ubl's Design Docs at Google ... the Llama three paper" |
| X1 Connections | "write to a temporary file, then rename it ... training a small language model end to end" |

MISSING: none.

Number check: all numbers match the lesson. Derived for speech (not written in the lesson):
"twice a twentieth times seven twenty is seventy-two" (step toward the lesson's 8.5 min), "reload from a
peer takes about twelve seconds" (lesson: 0.2 min), "about an eighth of a day" (lesson: 0.13 days).
