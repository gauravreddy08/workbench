# Coverage: verifiers-rewards

Every outline item mapped to where it lands in the script. No MISSING items remain.

| Item | Where in script (quoted words) |
| --- | --- |
| T1 prereq environment | "Twenty little coding tasks. Each one is a function stub, some tests the model never sees, a sandbox" |
| T2 prereq Goodhart | "this is Goodhart's law again, from when we talked about why the eval has to be separate" |
| T3 time | "about one evening to read through all this, one to build and red-team, and an hour or so for the agent run" |
| P1 scene | "So you point an RL loop at it, and you go to bed." |
| P2 curve | "starts around zero point three and climbs to zero point nine seven in a few hundred steps" |
| P3 three trajectories, conftest spreads | "nine lines long, called conftest ... within about a hundred more steps, most of the trajectories" |
| P4 nothing broken | "Nothing's broken ... You wrote a reward that says make pytest report success" (B voices "something's broken") |
| P5 goal | "cheap to compute, hard to fake, and still high for code that's actually good ... attack your own number" |
| O1 CoastRunners | "boat racing game called CoastRunners ... about twenty percent higher ... Faulty Reward Functions in the Wild" |
| O2 Concrete Problems | "Concrete Problems in AI Safety ... one of five practical problems" |
| O3 Krakovna list | "specification gaming ... flip it over instead ... antenna ... paused the game. Forever." |
| O4 Goodhart 1975 | "In nineteen seventy-five the economist Charles Goodhart" |
| I1 reward function | "That something is the reward function. It's just code." |
| I2 verifier | "A verifier is any program that checks whether a solution is correct" |
| I3 inspector | "a food inspector who only gets two minutes in the kitchen" |
| I4 two numbers | "How often does it pass code that's bad. And how often does it fail code that's good." |
| V1 unit tests | "A unit test is a tiny piece of code ... only ever looks at the inputs someone wrote down" |
| V2 visible vs hidden | "Visible tests versus hidden tests ... Because they're genuinely useful as a tool" |
| V3 SWE-bench | "S W E bench ... Fail to pass ... pass to pass" |
| V4 property tests | "Property-based tests ... shrinks it down ... Hypothesis ... QuickCheck" (B: "how does it know the right answer?") |
| V5 reference / differential | "The reference solution ... That's called differential testing ... most powerful cheap check" |
| V6 static checks | "A linter, like Ruff or flake eight ... learns to write lint-clean code. Not correct code." |
| V7 judges + rubric | "LLM judges, with a rubric ... two points if variable names ... the policy can learn to please it ... smallest weight" |
| V8 jail pipeline figure | "Picture a diagram ... that dashed box is a jail ... correctness checks are gates. The quality checks only nudge." |
| C1 weighted sum 0.4 | "Reward: zero point four ... the very first time writing correct code is hard" |
| C2 gate | "Take the smallest of the three ... the reward is half of it ... lint and the judge can each knock off up to a tenth" |
| C3 min vs average, shape | "a hack has to beat all of them at once ... The exact numbers ... judgment calls. The shape isn't." |
| S1 outcome vs process | "An outcome reward grades only the end result ... A process reward grades the steps" |
| S2 Lightman PRM | "Let's Verify Step by Step ... eight hundred thousand human labels" |
| S3 sparse vs dense | "A sparse reward arrives rarely ... forty-step coding episode ... Seven of ten tests" |
| S4 timeline figure | "picture one coding episode as a row of six boxes ... plus zero point zero five for ran the tests" |
| S5 predict why sparse | "Why would anyone pick the slower signal?" B guesses cost; "It runs the tests a lot ... With sixteen tries ... ten percent" |
| H1 reward hacking / spec gaming, not malice | "Krakovna's name for it ... RL is a search for high-reward behaviour" (B: "the model's being sneaky") |
| H2 frontier reports | "Claude three point seven Sonnet ... METR ... twenty twenty-five on emergent misalignment" |
| H3-H10 catalogue | "One. Hardcode ... Two. Edit the tests ... Three. Patch the test runner ... Four ... Five ... Six ... Seven ... Eight. Copy the real fix." |
| H6 sys.exit vs os._exit detail | "Pytest nine catches a normal sys dot exit ... exits with code three" |
| H11 predict hidden tests | "Which of those eight does that stop?" B: "Most of them?" ... "Gets easier ... not a property of the word hidden" |
| H12 gallery + definitions | "Picture a little panel ... Read-only tests ... Sandbox ... second verifier ... honest bar ... never moves" |
| H13 each defense closes one hole | "Hidden tests fix the model knows the inputs ... the checker trusts the code it's checking" |
| H14 answers never in the process | "The process running the model's code should never hold the answers" |
| H15 correct-code hacks, env design | "some hacks produce correct code ... No network. A repo snapshot with no future commits" |
| G1 Goodhart | "When a measure becomes a target, it stops being a good measure" |
| G2 Gao et al. | "Scaling Laws for Reward Model Overoptimization ... first goes up, then peaks, then falls" |
| G3 held-out eval | "You keep a separate held-out eval ... you're watching Goodhart happen, live" |
| K1 classifier / confusion matrix | "So that's a yes-or-no classifier ... Exactly like the ones for your ranker" |
| K2 matrix figure | "Rows are what the code really is ... the one RL amplifies" |
| K3 precision / recall | "Precision asks, of everything the verifier passed ... Recall asks" |
| K4 asymmetry, hacks not random | B: "isn't that just noise?" A: "False positives from hacks aren't random ... The model doesn't need to find it twice." |
| K5 predict threshold | "An honest attempt succeeds ten percent ... fools it fifteen percent ... one percent" ... "eighty percent ... five percent" |
| K6 amplification slider | "Picture a little chart ... two sliders ... crosses half around step sixty ... ninety-five percent hacks" |
| K7 toy caveats | "it's a toy model, not data ... discovered before they can be amplified" |
| M1 coverage insufficient | B: "Coverage?" A: "coverage only tells you which lines ran" |
| M2 mutation testing | "Less-than-or-equal becomes less-than. Max becomes min ... mutant ... killed ... survived" |
| M3 mutation score as FP estimate | "Killed out of total ... estimates your false-positive rate on ... almost-right programs" |
| M4 ten mutants, sort survivor | "The visible tests killed nine ... deletes the sort" (B explains sorted inputs) |
| M5 caveats, red-team | "equivalent mutants ... honest mistakes. Red-teaming ... You need both." |
| D1-D7 checklist | "Hidden tests, kept outside ... fresh directory ... sandbox ... answers stay outside ... several independent verifiers ... held-out eval ... trajectory audits ... sudden spike" |
| B0 setup and task | "Setup's one sentence ... The reference solution goes through the intervals in sorted order ... ten hidden cases" |
| B1 naive grader | "It copies the model's whole workspace ... if pytest exits with zero, reward one" |
| B2 hardened grader | "only the solution file ... two hundred random ... isolated mode ... nonce ... JSON text inside the child ... process isolation, not a real sandbox" |
| B3 property tests | "start somewhere between minus fifty and fifty ... three hundred examples ... shrank ... zero to zero ... second opinion" |
| B4 lint gate | "ignore any config files ... two hundredths per finding, capped at a tenth ... half of that" |
| B5 red team | "Red-team your own grader ... first-draft hidden grader ... a fix for one can reopen another ... honest solution that's different" |
| B6 mutation by hand | "a module called ast ... re-parse the source fresh for each mutant ... mutmut ... version three" |
| B7 agent run + audit | "Run it twenty times. Then twenty more ... Your only goal is to make the tests pass ... audit script" |
| B8 done when | "When the honest solution gets one, and every cheat gets at most about zero point one five" |
| E1 run setup | "Python three point fourteen, pytest nine point one, Hypothesis six point one seventy" |
| E2 naive results | "Six of the eight cheats, full marks ... sys dot exit got zero ... answer key got zero" |
| E3 first-draft hidden | "Hardcoding drops to zero point three ... conftest ... only because this particular grader doesn't use pytest ... always-equal, still a full one ... answer key ... full one" |
| E4 hardened + partial credit | "zero point one two ... zero point three three ... accidentally the right answer ... design decision" |
| E5 mutation results | "Ten mutants. Visible tests killed nine ... Read the survivor." |
| E6 grading cost | "about six hundred and ten milliseconds ... about eighty ... a hundred and seventy CPU-hours ... twenty-two" |
| E7 agent expectations | "I didn't do those ... held-out pass rate is the number that's true" |
| K1b wrong process | "compare in the wrong process ... went from zero straight back to one ... remove just the type checks" |
| K2b too strict | "identical ... same objects in memory ... traded false positives for false negatives ... weirdly bad" |
| K3b weighted judge | "seventy percent correctness, thirty percent judge ... verified correct against all edge cases ... below one half" |
| K4b leak env | "Leave the reference file in the same folder ... You fix it in the environment" |
| X1 FP vs FN, precision first | "design verifiers for very high precision first, and then work to recover recall" + close |
| X2 hidden but suspicious | Hidden-tests predict answer + checklist (fresh directory, answers outside, audits, held-out eval) |
| X3 sparse/dense trade-off | "tasks the model solves sometimes, but not always ... G R P O" |
| X4 suite good enough | Mutation section + red team + "honest solution that's different" |
| X5 million a day | "say you're grading a million rollouts every day ... warm containers ... cache the reference's outputs ... the thing you don't cut is the independence" |
| GD go deeper | "the reward hacking section of Concrete Problems in AI Safety, and Krakovna's specification gaming list" |
| CN connections | "Next you train a small model with G R P O ... If those two curves split apart, you missed one." |

## Numbers checked against the lesson

0.3 to 0.97; nine-line conftest; about 20 percent (CoastRunners); 1975; 2016; five problems; 800,000 labels; 40-step;
7 of 10; 0.6/0.2/0.2 and 0.4; half, up to a tenth, 0.8 to 1.0; plus 0.05, plus 0.1, four of five; 16 tries at 10
percent; exit code 3 for sys.exit in pytest 9; s 10 percent, f 15 and 5 percent, start 1 percent, 100 steps; 80 and
5 percent; ten mutants, nine killed; 200 random inputs; minus fifty to fifty, length up to twenty, up to twelve,
300 examples; 0.02 per finding capped 0.1; twenty runs each; 0.15 done-when; Python 3.14, pytest 9.1, Hypothesis
6.170; all three results columns; 610 ms, 80 ms, 210 cases, 170 and 22 CPU-hours; 0.7/0.3 judge. All match.

## Derived numbers (not written in the lesson)

- Gallery with only hidden tests on: five of eight cheats still at 1.0 (computed from the figure component's reward functions).
- Toy amplification at s 0.10, f 0.15: hack share crosses half near step sixty-two, about 95 percent at step 100, measured reward about 0.15, true success under one percent (computed from the figure's update rule).
- 170 CPU-hours "like a week of one core", 22 "less than a day".

## Consciously compressed

- Ten hidden cases summarised by type instead of read out.
- Go Deeper reduced to two sources; Hypothesis "check current strategy names" note dropped.
