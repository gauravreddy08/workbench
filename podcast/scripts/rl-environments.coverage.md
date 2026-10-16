# Coverage: rl-environments

Lesson src/lessons/rl-environments.mdx vs podcast/scripts/rl-environments.md. Item IDs match
podcast/outlines/rl-environments.md. "Fixed" = was MISSING or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs re-explained where used | Anatomy; Throughput; Build It | "a container, quickly, is just a normal process..."; "There's a rule, it's Little's law"; "The GIL, the global interpreter lock, means..." | covered |
| P1 model, algorithm, nothing to practise on | Problem | "you don't have anything for the model to practise on" | covered |
| P2 practice loop, thousands per step, clean copy, safe, unfakeable, GPUs idle | Problem | "a cluster of GPUs isn't sitting there idle, waiting on somebody's unit tests" | covered |
| P3 environment = practice arena; Code RL posting | Problem | "\"design RL environments\" is right there as core work" | covered |
| P4 too easy / broken / slow | Problem | "you can afford ten times less practice" | covered |
| O1 own simulators, reimplementing | Origin | "comparing two papers meant reimplementing both of them" | covered |
| O2 ALE 2013, DQN | Origin | "Bellemare and colleagues put out the Arcade Learning Environment" | covered |
| O3 Gym 2016, reset and step | Origin | "an object with two methods. Reset, and step" | covered |
| O4 Gymnasium 2022, terminated/truncated | Origin | "Farama Foundation took it over in twenty twenty-two" | covered |
| O5 HumanEval 2021, SWE-bench 2023, world to practise in | Origin | "It becomes a world a model can practise in" | covered |
| I1 board game | The loop | "learning a new board game with no rulebook" | covered |
| I2 agent, environment | The loop | "everything that isn't the agent. The board, the rules, the opponent, the scorekeeper" | covered |
| I3 observation, action, reward, episode/rollout/trajectory | The loop | "You'll also hear rollout, or trajectory" | covered |
| I4 Figure 001 loop + episode row | The loop | "If you drew it, it's two boxes" | covered |
| I5 hidden state | The loop | "a coding model sees only the files it chose to open" | covered |
| I6 reward only definition of good | The loop | "The reward is the only definition of \"good\"" | covered |
| I7 policy as probabilities, 0.9, training shifts them | Policy | "push left with probability zero point nine" | covered |
| I8 randomness = exploration, compare episodes | Policy | "randomness is how it tries things it hasn't tried before" | covered |
| I9 environment doesn't learn | Policy | "It's a referee and a world simulator" | covered |
| I10 CartPole code in words | Gym contract | "You call reset with a seed, say forty-two" | covered |
| I11 reset, info, seed | Gym contract | "What's info for?" / "Debugging extras" | covered |
| I12 step returns five things | Gym contract | "Step gives you back five things" | covered |
| I13 return | Gym contract | "It's the return" | covered |
| I14 Figure 002, 500-step truncation, perfect policy truncated | Gym contract | "a perfect policy... is always truncated. Never terminated" | covered |
| I15 single done flag bug | Gym contract | "For a pole that was perfectly balanced when the clock ran out? That's a lie" | covered |
| I16 coding: submit vs 30-call / token budget | Gym contract | "a thirty-tool-call limit, or the token budget, that's truncation" | covered |
| I17 mapping table | LLM agent | "In CartPole the observation is four numbers" | covered |
| I18 huge action space, errors as observations, token vs tool call zoom | LLM agent | "it's two zoom levels" | covered |
| I19 cumulative observation, harness | LLM agent | "That's the harness" | covered |
| I20 sparse reward, credit assignment, intermediate signals gameable | LLM agent | "That's called the credit assignment problem" | covered |
| I21 Figure 003 median episode, 180 to 470 tokens, 7/8, 0.875 | One coding episode | "Seven out of eight pass... zero point eight seven five" | covered |
| I22 never saw hidden tests; one number is all | One coding episode | "all the learner gets is that number" | covered (fixed: removed "the entire lesson" phrasing) |
| I23 Predict visible vs hidden | Visible and hidden | "The visible tests are a tool for the model. The hidden tests are the referee" | covered |
| I24 seven parts, four touched / three private | Anatomy | "It's seven" | covered |
| I25 task spec, mind-reading, median | Anatomy | "is testing mind-reading" | covered |
| I26 starting state, image | Anatomy | "\"clone the repo and pip install\" is not a starting state" | covered |
| I27 sandbox, policy exploring | Anatomy | "It's a policy exploring. Which is honestly worse" | covered |
| I28 tools, bash, truncate outputs | Anatomy | "A full bash shell is more realistic, and a lot more dangerous" | covered |
| I29 termination caps, slowest episode | Anatomy | "a training step finishes when its slowest episode does" | covered |
| I30 reward function, 0/1 | Anatomy | "Real setups often use just zero or one" | covered |
| I31 metadata, Tuesday | Anatomy | "why did reward jump on Tuesday?" | covered |
| I32 measuring instrument, deterministic | Same seed | "An environment is a measuring instrument" | covered |
| I33 unpinned deps | Same seed | "pin exact versions, build the image once, and record its digest" | covered |
| I34 network off | Same seed | "turn the network off in the sandbox" | covered |
| I35 time, random, hash seed | Same seed | "fix Python's hash seed with an environment variable" | covered |
| I36 flaky tests | Same seed | "drop any task whose reward isn't identical every single time" | covered |
| I37 zero/one check, fail-to-pass, pass-to-pass | Same seed | "the untouched starting state must score zero" | covered |
| I38 Predict sandboxes: 2,048, 11 h, ~700, Little's law, terabyte | Throughput | "about seven hundred sandboxes busy at the same time" | covered |
| I39 reset cost tiers | Throughput | "If it just copies a directory, it's about a millisecond" | covered |
| I40 steps cheap, hard timeout, p99 | Throughput | "the ninety-ninth percentile episode" | covered |
| I41 no shared state, 8 vs serial | Throughput | "No shared temp directory, no fixed port number" | covered |
| I42 GRPO, advantage, zero gradient | Signal | "Advantage zero for all of them" | covered |
| I43 formula in words + worked example | Signal | "one, minus the chance they all pass, minus the chance they all fail" | covered |
| I44 Figure 005 sliders, wider band, cost, dashed variance | Signal | "it's a hill" | covered |
| I45 Predict 2% -> 15%, 50% -> 99%, six times | Signal | "only about fifteen percent of groups are useful" | covered |
| I46 difficulty filter 10-90%, retire, re-run | Signal | "roughly in the ten to ninety percent band" | covered |
| I47 three task sources | Signal | "Real history... Synthetic breakage... written from scratch" | covered |
| I48 contamination defined | Contamination | "Solving that task measures memory, not skill" | covered |
| I49 signs | Contamination | "with the maintainer's variable names" | covered |
| I50 mitigations in order | Contamination | "prefer tasks created after the model's data cutoff" | covered |
| I51 within-environment leak | Contamination | "the environment leaking its own answer key" | covered |
| I52 untrusted not hostile; one episode | Sandbox | "the worst possible episode costs you one episode" | covered |
| I53 Figure 006 three layers | Sandbox | "Picture three boxes nested inside each other" | covered |
| I54 inner layer limits, Mac memory cap ValueError, cgroups | Sandbox | "it just raised a value error instead of capping anything" | covered |
| B0 task pool, broken test, spread | Build It | "It imports a module that doesn't exist" | covered |
| B1 sandbox, both limits, negative rc, 2.7 s | Build It | "The timeout is wall-clock time... The CPU limit counts only time actually spent computing" | covered |
| B2 CodeEnv + four decisions, max 12 steps | Build It | "dot dot slash dot dot slash etc slash password file" | covered |
| B3 validator | Build It | "you fix the task, not the validator" | covered |
| B4 no-op/random baselines | Build It | "These are your floor" | covered |
| B5 LLM baseline, 300 calls, review | Build It | "about three hundred calls with short contexts" | covered |
| B6 bench, thread pool, GIL | Build It | "the threads aren't doing the work" | covered |
| B7 container flags, Spark | Build It | "Network set to none. Memory capped at five hundred twelve megabytes" | covered |
| B8 done when | Build It | "And you're done when the validator passes" | covered |
| M1 measure across three setups | Measure | "on the Mac, then on the Spark with plain subprocesses" | covered |
| M2 Predict reset vs submit | Measure | "Submit, by about a hundred times" | covered |
| M3 reference numbers + caveat | Measure | "Load average above seventy" | covered |
| M4 running code is the cost | Measure | "running code is the cost" | covered |
| M5 near-linear parallel | Measure | "about an eighth of the serial time" | covered |
| M6 container per call vs per episode | Measure | "you pay the container cost once, at reset" | covered |
| M7 LLM baseline buckets | Measure | "read the zero-out-of-three transcripts first" | covered |
| X1 leak answer key | Break It | "anything in the sandbox is part of the observation" | covered |
| X2 fake the score, reward hacking, fixes | Break It | "that's reward hacking in its purest form" | covered |
| X3 nondeterminism | Break It | "Some fraction of your reward is coin flips" | covered |
| X4 shared state | Break It | "some episodes get scored on somebody else's code" | covered |
| E1 what is an environment | Policy; Close | "It's a referee and a measuring instrument" | covered |
| E2 mapping + credit assignment | LLM agent | (I17-I20) | covered |
| E3 terminated vs truncated value | Gym contract | "the episode stopped, but the world didn't end" | covered |
| E4 scale question | Throughput | "Serially that's about thirty-three hours a step" | covered |
| E5 task selection | Same seed; Signal; Contamination | (I37, I45, I46, I50) | covered |
| G1 Go Deeper | Close | "Sutton and Barto's reinforcement learning book, chapter three" | covered |
| C1 Connections | Close; Anatomy; LLM agent | "the next thing after this is rewards and verifiers" | covered (GRPO/long-horizon/agent-harness links compressed to mentions) |

Numbers checked against the lesson: 2013, 2016, 2021, 2022, 2023; 0.9; 42; 500 steps; 30 tool calls;
4 numbers; 20 actions; seed 7; ~180 and ~470 tokens; 2.5 vs 3; 7/8 = 0.875; 256 x 8 = 2,048; 20 s; ~41,000 s;
~11 h; ~700; 1 GB; 2,000 x 1 min ~ 33 h; 1,000+; 2% / 8 -> ~85% / ~15%; 50% -> ~99%; ~6x; 10-90%; ~4,000
chars; 2 s CPU cap -> ~2.7 s; 12 max steps; 5 repeats; ~20 tasks; 4-10 hidden tests; 300 calls; 200 / 50 / 64
/ 8; 512 MB, 1 CPU, 128 pids, Python 3.12; Python 3.14, load above 70; 0.9 ms, 40 us, 110 ms, 100 ms. All match.

Derived (not written in the lesson): ~34 episodes started per second; five or six Sparks' worth of
memory (700 GB / 128 GB); 0.5^8 ~ four tenths of a percent; the two-attempt worked example (a half);
view_file vs submit ~ two and a half thousand times, "a minute vs almost two days".
