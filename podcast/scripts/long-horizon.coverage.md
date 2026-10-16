# Coverage: long-horizon

Lesson src/lessons/long-horizon.mdx vs podcast/scripts/long-horizon.md. Item IDs match
podcast/outlines/long-horizon.md. "Fixed" = was MISSING or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs | Measure; What makes long tasks hard | "The standard error is how much a measured average would jump"; "The context window is the most text" | covered (re-explained inline) |
| P1 small job | Problem | "Rename a config key in one file, fix the one test" | covered |
| P2 ten in a row | Problem | "confidently editing a file it already edited" | covered |
| P3 forty-file migration | Problem | "Somewhere around file twelve it misread a value" | covered |
| P4 not dumber, forty in a row | Problem | B "it got... tired?"; A "you asked it to be right forty times in a row" | covered |
| P5 Code RL framing, three things | Problem | "long-horizon autonomous engineering tasks"... "Which really means three things" | covered |
| O1 ALVINN 1989 | Origin | "Nineteen eighty-nine, Carnegie Mellon... Alvin" | covered |
| O2 no recovery data, drift | Origin | "the network basically never saw what to do" | covered |
| O3 synthetic shifted images | Origin | "He synthesised shifted camera images" | covered |
| O4 Ross/Bagnell, imitation learning, square growth, DAgger | Origin | "it can grow with the square of the length"; "gave the fix a name: DAgger" | covered |
| O5 LLM version, depends on recovery | Origin | "a long enough output almost surely goes wrong somewhere" | covered |
| I1 baking scene | What a horizon is | "the moment you pour the flour, she goes, too much" | covered |
| I2 trajectory, step = tool call | What a horizon is | "is called a trajectory. People also say rollout, or episode" | covered |
| I3 horizon definition | What a horizon is | "how many of those steps happen between the start and the moment you find out" | covered |
| I4 essay vs sixty tool calls | What a horizon is | B "long output... lots of tokens"; A "three-thousand-token essay in one shot" | covered |
| I5 two timelines picture | What a horizon is | "Picture two timelines, one on top of the other" | covered |
| I6 two problems | What a horizon is | "More chances to be wrong. And mistakes stay hidden longer." | covered |
| C1 p to the n model | Being right forty times | "p, times p, times p, n times over" | covered |
| C2 Predict 99% -> 37% | Being right forty times | B guesses "high eighties"; A "About thirty-seven percent" | covered |
| C3 69 steps, shortcut, 693, checked in Python | Being right forty times | "point six nine divided by the failure rate"; "six hundred ninety-three" | covered |
| C4 inverse scaling, 98->99 doubles, 99.9 times ten | Being right forty times | "Halve the failure rate, double the length" | covered |
| C5 table landmarks | Being right forty times | "At ninety percent per step, a ten-step task succeeds about thirty-five percent" (all five rows) | covered |
| C6 demo vs system | Being right forty times | "a demo that works and a system that works" | covered |
| C7 hazard rate, half-life | Being right forty times | "constant hazard rate"; "your agent literally has a half-life" | covered |
| F1 grid of 24 runs | Twenty-four agents | "Twenty-four rows, each row is one simulated agent" | covered |
| F2 95% steps right, few finish | Twenty-four agents | "it says about ninety-five percent... Like three" | covered |
| F3 grey wasted work | Twenty-four agents | "Every grey square is a step the agent actually took" | covered |
| R1 contradiction, not always fatal | Recovery | B "how does anything work?" | covered |
| R2 good engineer examples | Recovery | "They mistype a path... off-by-one bug" | covered |
| R3 three fates | Recovery | "three arrows coming out of it" | covered |
| R4 r, fatal rate, q | Recovery | "five percent failure rate and you recover half... ninety-seven and a half percent" | covered |
| R5 multiply, training implication | Recovery | "recovers from half its mistakes has exactly the same horizon" | covered |
| R6 Predict A vs B -> same, ~27 | Recovery | "both hit the coin flip around twenty-seven steps" | covered |
| R7 not same in practice, harnesses | Recovery | "its horizon halves. A doesn't care" | covered |
| V1 verifier term | Verification | "Anything that checks the agent's work... is called a verifier" | covered |
| V2 every k, catch rate, 3 attempts | Verification | "catch rate... sixty percent catch rate misses four bugs in ten" | covered |
| V3 block math in words | Verification | "clean the first time. Or it's bad, gets caught, and the retry's clean" | covered |
| V4 74.2 vs 74.4 | Verification | "seventy-four point two percent... seventy-four point four" | covered |
| V5 Predict 13% -> 99.5% / 35% | Verification | "About ninety-nine and a half percent"; "about thirty-five percent" | covered |
| V6 quality over frequency | Verification | "Verifier quality beats verifier frequency" | covered |
| V7 three-curve chart | Verification | "Three curves. A dashed one... A thin one... a bold blue one" | covered |
| V8 things to find (four) | Verification | "Horizon about sixty-nine. Drag it to ninety-eight"; "every twenty steps" | covered |
| M1 human time | METR | "measure tasks in human time" | covered |
| M2 paper citation | METR | "Thomas Kwa and colleagues, twenty twenty-five" | covered |
| M3 method | METR | "about a hundred seventy... H CAST... R E Bench... S W A A"; "from GPT two" | covered |
| M4 schematic | METR | "Every task's a dot. Picture it." | covered |
| M5 headline numbers | METR | "Claude three point seven Sonnet... around fifty minutes... every seven months" | covered |
| M6 not 50 min of work | METR | B "can work on its own for about fifty minutes"; A corrects | covered |
| M7 task-suite tied, external validity | METR | "they call it external validity" | covered |
| M8 trend not law | METR | "It's a measurement, not a law of nature" | covered |
| M9 50% low bar | METR | "fifty percent is a low bar" | covered |
| M10 Ord half-life, logistic vs exponential | METR | "Is there a half-life..."; "the S-curve decays more slowly at long lengths" | covered |
| H1 coin flips | Hard | "treats every step as an independent coin flip" | covered |
| H2 state tracking | Hard | "First, state tracking" | covered |
| H3 context limits | Hard | "Context limits. The context window is..." | covered |
| H4 delayed feedback | Hard | "Third, sparse and delayed feedback" | covered |
| H5 planning | Hard | "Fourth, planning" | covered |
| H6 verification, weak check | Hard | "trusting a weak check, which is low c"; "writes a test that always passes" | covered |
| H7 irreversible | Hard | "A force push in git... r is zero by definition" | covered |
| L1 RL, reward | Learn | "A reward's just a number the environment hands back" | covered |
| L2 credit assignment | Learn | "that's called credit assignment" | covered |
| L3 credit picture | Learn | "Picture forty boxes in a row... box four shaded" | covered |
| L4 why length hurts | Learn | B "it just learns a bit slower"; A "buried under the randomness" | covered |
| L5 REINFORCE/PPO/GRPO | Learn | "P P O learns a separate estimate... G R P O has the model attempt the same task" | covered |
| L6 levers | Learn | "Denser feedback... Shorter effective horizons... lots more samples" | covered |
| B1 SWE-bench, Verified | Benchmarks | "Two thousand two hundred ninety-four real GitHub issues"; "five-hundred-task subset" | covered |
| B2 METR suites | Benchmarks | "Meter's own suites, H CAST and R E Bench" | covered |
| B3 tau-bench, pass^k | Benchmarks | "pass hat k. The chance that all k independent attempts" | covered |
| B4 leaderboard caveat | Benchmarks | "check the benchmark's own leaderboard" | covered |
| BI1 three pieces | Build It | "Three pieces. A task suite..." | covered |
| BI2 dependency chain | Build It | "dependency chain of config files" | covered |
| BI3 file rule example | Build It | "file six's value times three, plus the length of the name in file four" | covered |
| BI4 setup | Build It | "a virtual environment, the Anthropic SDK plus numpy" | covered |
| BI5 small cheap model | Build It | "use a small, cheap model" | covered |
| BI6 budget, square growth | Build It | "fifteen thousand... five hundred forty thousand... eight million" | covered |
| BI7 seeded, refs, unit test | Build It | "Seed a random generator"; "Unit-test it on a hand-made wrong answer" | covered |
| BI8 global correctness | Build It | "Global correctness asks" | covered |
| BI9 local correctness, p hat | Build It | "Local correctness is the other one"; "Call it p hat" | covered |
| BI10 harness loop | Build It | "Four tools: list the files, read a file, write a file, and done" | covered |
| BI11 fake agent first | Build It | "before you spend a single cent, write a fake agent" | covered |
| BI12 sweep, recoveries | Build It | "count recoveries: files where the first write was locally wrong" | covered |
| BI13 fairness review | Build It | "have an agent review the harness" | covered |
| BI14 fits, four numbers | Build It | "compare four things" | covered |
| BI15 verifier rerun | Build It | "Add a check tool... catch-rate setting" | covered |
| BI16 done when | Build It | "within about one point of ninety-five over two hundred episodes" | covered |
| ME1 fill from traces | Measure | "fill everything in from the trace files" | covered |
| ME2 standard error 0.16, 20-80 | Measure | "about point one six"; "somewhere from about twenty to eighty" | covered |
| ME3 0.931-0.965, 10-19.5, 0.940-0.960 | Measure | "point nine three one to point nine six five... ten to nineteen and a half" | covered |
| ME4 forty step measurements | Measure | B "it's forty step measurements" | covered |
| ME5 p hat flat or falling | Measure | "p hat should be roughly the same at every length" | covered |
| ME6 q hat higher | Measure | "If the fitted q hat comes out higher than p hat" | covered |
| ME7 q hat lower | Measure | "If q hat comes out lower than p hat" | covered |
| ME8 verifier expectations, skipped tool | Measure | "check whether the model actually called check" | covered |
| ME9 tail, 80 steps | Measure | "a few runs at eighty steps" | covered |
| BK1 silent mistakes | Break It | "make mistakes silent... strip out the rule comment" | covered |
| BK2 starve context | Break It | "Only keep the last six tool results" | covered |
| BK3 irreversible + undo | Break It | "if this value is even, delete file three" | covered |
| BK4 game verifier | Break It | "only reports on the last file written" | covered |
| E1 definition, essay nuance | What a horizon is | "the essay can still go wrong in compounding ways, sure" | covered |
| E2 99% scaling, recovery, decay | Being right; Recovery; Hard | "Going from ninety-nine to ninety-nine point nine multiplies it by ten"; "constant-p assumption breaking" | covered |
| E3 METR summary, Ord | METR | as M3-M10 | covered |
| E4 tests after every edit; cost, slow suite | Verification | "checks and redos aren't free"; "Checking rarely is cheap per check" | fixed ("They cost steps, tokens, and wall time" added) |
| E5 RL harder, rare rewards, curricula | Learn | "Rewards get rarer"; "which is called a curriculum" | fixed (rare-reward and curriculum added) |
| G1 best sources | Connections | "read the Meter paper... and Toby Ord's half-life paper" | covered |
| G2 connections | Connections | "Managing context goes after one cause" | covered |

Numbers checked against the lesson: 37%, 69, 693, table rows, 27, 74.2/74.4, 40,000, 13%, 99.5%,
35%, ~170, 66, 50 min, 7 months, 2,294, 12, 500, 15k/540k/8M, 150 tokens, 0.16, 20-80,
0.931-0.965, 10-19.5, 0.940-0.960, 6 tool results, 200 episodes. All match.
Derived (not in lesson): "with an average of one mistake, the chance of zero is about a third"
(e^-1 = 0.37); "go out about two standard errors for a real range" (explains 20-80).
