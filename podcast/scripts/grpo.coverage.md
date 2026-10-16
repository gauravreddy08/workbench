# Coverage: grpo

Every outline item -> where it lands in podcast/scripts/grpo.md (a few quoted words). No MISSING.

| Item | Lands in script |
| --- | --- |
| T1 RL environment prereq | "when we built the RL environment, the sandbox with a reset and a step and hidden tests" |
| T2 verifiers / reward hacking prereq | "same thing we saw when we tried to game our own verifiers"; "you've gamed one yourself" |
| T3 DPO prereq | "Quick reminder of what DPO is: you have pairs of answers ... frozen copy of where it started" |
| T4 memory math, bandwidth-bound | "Adam keeps two extra numbers per parameter"; "every decode step ... has to read every weight" |
| T5 rough time | "Plan on an evening to understand it and a weekend to run it" |
| P1 checker scene | "use three, seven and four, each exactly once, and make forty ... is forty or it isn't" |
| P2 Qwen 0.5B | "Qwen two point five, the half-a-billion-parameter instruct version" |
| P3 SFT rejected | B "normal supervised fine-tuning"; A "imitate your solver's style. Not to search ... no solver to write" |
| P4 DPO rejected | "throws away most of your samples ... still trains offline" |
| P5 try + grade, no target token | "a model that can try. And a checker that can grade ... only a verdict, at the very end" |
| P6 verdict into gradient | "Turning a verdict into a gradient ... the checker is code" |
| O1 RLHF, InstructGPT | "R L H F ... OpenAI's InstructGPT, in twenty twenty-two" |
| O2 critic cost | "another seven billion parameter network ... token forty of a five-hundred-token answer" |
| O3 DeepSeekMath | "February twenty twenty-four ... Zhihong Shao ... Group Relative Policy Optimization" |
| O4 R1, R1-Zero, pass@1 | "fifteen point six percent to seventy-one percent pass at one"; "average that over several sampled attempts" |
| O5 reproductions | "labs and hobbyists were reproducing ... on a single machine" |
| I1 policy as distribution (diagnostic gap) | B "the model outputs the next token"; A "The model never outputs a token ... that's a probability distribution" |
| I2 prompt/action/reward | "The prompt is the situation. Each token ... is an action ... one for correct and zero for wrong" |
| I3 expected reward | "Not the reward of one answer. The expected reward" |
| F1 the loop | "here's the loop, drawn like a diagram ... tied to the policy with a leash" |
| I4 four answers two pass | "You sample four answers. Two of them pass" |
| I5 log-prob of completion | "take the log of each token's probability and add them up" |
| I6 weighted gradient | "the average, over your samples, of how good the answer was times the direction" |
| I7 REINFORCE unbiased, identity | "Ronald Williams in nineteen ninety-two ... gradient of a probability equals the probability itself times the gradient of its log" |
| I8 no differentiating the checker | B "Do you, like, backprop through the checker?"; A "You never differentiate the checker" |
| I9 SFT on own samples | "policy gradient is supervised fine-tuning on your own samples, weighted by how good they were" |
| I10 loss in code | "Minus the average of weight times the answer's log-prob ... optimisers minimise" |
| I11 six/five shift | "six for correct and five for wrong ... tug of war between huge forces" |
| PR1 baseline variance predict | "Twice? Ten times? A hundred?"; "twenty point eight ... zero point zero nine four ... About two hundred twenty times" |
| I12 baseline definition | "anything that doesn't depend on which answer was sampled ... leaves the gradient unbiased" |
| I13 advantage | "The advantage. How much better this answer was than expected" |
| F2 two panels of arrows | "plus three quarters ... each at minus a quarter" |
| I14 variance, enemy of RL | "jumps around from batch to batch ... a cleverer way to get a good baseline" |
| I15 value model, GAE | "Schulman and colleagues, twenty seventeen ... G A E ... trading a little bias for a lot less variance" |
| I16 ratio, clip twenty percent | "One point two means the token got twenty percent more likely ... its gradient just switches off" |
| I17 four models | "P P O means holding four models at once" |
| F3 clip graphs | "Picture two little graphs ... at one point two, the line goes flat ... below zero point eight" |
| I18 min, pessimistic, wrong-way still pulls | "Taking the smaller one makes it pessimistic ... the gradient is still on, pulling it back" |
| PR2 clip does nothing | B "stops the step from being too big?"; A "It does nothing ... num iterations ... mu ... A bug in your clip is invisible" |
| I19 value model fragile | "has to learn to predict a zero-or-one that only arrives hundreds of tokens later ... asking again" |
| I20 group, formula | "G is just the group size, typically somewhere from four to sixty-four ... divided by the group's standard deviation" |
| I21 group mean = baseline | "made fresh, for this exact prompt ... every token of an answer gets the same advantage" |
| I22 std debated, same scale | "seven out of eight pass ... one out of eight pass, both produce pushes of about the same total size" |
| I23 closed form | "plus three point eight seven ... minus zero point two six ... square root of fifteen ... The rarer a success" |
| F4 interactive group step | "picture a little interactive panel ... seventeen times twenty-four ... three sliders ... greyed out" |
| I24 dead groups, formula, 66/44% | "point nine five, multiplied by itself eight times ... two hundred thousand simulated groups ... sixty-six percent ... forty-four percent" |
| I25 bigger G rescues | "Bigger G rescues hard prompts ... Slide G to sixteen and groups light up" |
| I26 noise fakes signal | B "a little noise can't hurt"; A "trained, hard, on coin flips ... Not a judge's mood" |
| PR3 plateau predict | "point two eight, to point four nine ... point seven three ... thirty-five out of sixty-four ... fifty-nine ... zero point three percent ... ran out of learnable prompts" |
| I27 full loss | "For each prompt, you sample G answers from the old policy ... minimise minus that" |
| I28 three ideas | "Three ideas. One: it's P P O's clipped policy gradient ... a leash" |
| I29 KL, reference model | "K L divergence is just a measure of how different two probability distributions are ... It never trains" |
| I30 why the leash, beta 0.04 | "degenerate text that happens to pass the verifier ... DeepSeekMath used zero point zero four" |
| I31 KL estimator | "the ratio, minus the log of the ratio, minus one ... one minus zero minus one, zero ... Approximating KL Divergence" |
| I32 KL in loss vs reward, DAPO/TRL drop it | "G R P O puts the K L in the loss ... DAPO does, and recent T R L defaults do too" |
| F5 memory columns | "Picture two columns ... The price moved. From memory, to generation" |
| I32b reward changed | "RL on language models wasn't new in twenty twenty-five. What changed was the reward" |
| I33 learned RM blind spots, R1 avoided | "Longer answers. A confident tone. Flattering phrasing ... avoided neural reward models" |
| I34 verifier, RLVR, Tulu 3 | "microseconds to seconds ... AI two's Tulu three report ... R L V R" |
| I35 R1 carefully, o1 | "DeepSeek V three Base ... think tags ... mixed languages ... cold start ... o one came out in September twenty twenty-four" |
| I36 won't discover algebra | "It will not discover algebra" |
| I37 loss meaningless | B "Watch it go down"; A "hovers around zero no matter how well training's going" |
| I38 mean reward, held-out greedy | "on a fixed held-out set of puzzles ... greedy decoding" |
| I39 frac zero std | "frac zero S T D ... is there anything left to learn gauge" |
| I40 length, truncated | "the fraction that hit the max length ... racing up to the cap is a disease" |
| I41 KL creep / spike | "It should rise slowly. A sudden spike means something broke out" |
| I42 entropy, nats, collapse | "measured in nats ... That's called collapse" |
| I43 clip fraction | "the clip fraction. What share of tokens had their ratio hit the clip" |
| F6 dashboard shapes | "Picture five little charts ... Those are shapes, not measurements" |
| I44 four phases | "Generate ... Score ... reference model forward ... train" |
| I45 generation slow, bandwidth, longest answer | B "training's the expensive one"; A "it's backwards here ... bound by memory bandwidth ... waits for its longest answer" |
| PR4 time split predict | "about four milliseconds per step ... tens of milliseconds ... one point four times ten to the fourteen ... seventy to ninety percent ... V L L M or S G Lang ... Fast inference is fast RL ... all G answers share one prompt" |
| B0 plan | "a Countdown checker, your own G R P O loop ... then point it at your coding environment" |
| B1 why 0.5B, 5%/90%, 1.5B | "under about five percent or over about ninety percent ... one point five billion version" |
| B2 setup | "Setup is one sentence ... NVIDIA's PyTorch container or the wheel index" |
| B3 memory and logits | "under about ten gigabytes ... fifty-four million logits ... About twenty-seven gigabytes ... micro-batches" |
| B4 verifier and tests, held-out | "takes the last answer tag ... Just writing forty fails ... sneak in an import ... two hundred puzzles from a fixed random seed" |
| B5 rollout | "Pad on the left ... temperature one and no top-p ... end-of-sequence token itself ... G minus one ... non-zero advantages that sum to zero" |
| B6 loss, shift, sanity test | "shift them by one ... look plausible and learn nothing ... thirty-two-bit floats just for that slice ... minus that answer's advantage, divided by the number of answers times that answer's length"; KL gradient zero "slope is flat" |
| B7 loop, hints | "one times ten to the minus six ... clip the gradient norm at one ... every twenty steps ... dropout is off ... synchronize ... gradient checkpointing ... half the point" |
| B8 TRL | "five thousand puzzles ... per-device batch size counts ... loss type and reward-scaling ... V L L M does to your time split ... The comparison, you write" |
| B9 coding env, partial credit | "All or nothing ... or partial credit"; B "Partial credit ... there's spread"; "process pool ... have an agent review your reward function" |
| B10 done when | "You're done when your loop runs two hundred steps without any NaNs ..." |
| M1 what to log | "averages over ten steps around step zero, fifty, a hundred and two hundred, and the T R L run" |
| M2 reward flattens, 0.73 | "My toy simulation flattened at point seven three" |
| M3 U shape | "follows a U shape ... watch the switch happen" |
| M4 length, truncation penalty | "think briefly ... a length penalty you never wrote" |
| M5 KL under 0.1 nats | "well under a tenth of a nat per token ... rough expectation" |
| M6 entropy drifts down | "Entropy drifts down slowly. That's the model getting sure" |
| M7 generation dominates | "If it doesn't, check you synchronized ... With V L L M it should drop a lot" |
| M8 read the samples | "ignore the format. Then reliably formatted ... check it, and try another" |
| K1 remove baseline | "it still learns, just slower and noisier ... five and six ... barely learns" |
| K2 sloppy verifier | B "it's just going to write the number"; A "Held-out accuracy ... doesn't move" |
| K3 starve the signal, DAPO | "four-number puzzles ... G from eight to sixteen ... DAPO ... filtered out dead groups and resampled" |
| K4 run wild, length bias, Dr. GRPO | "beta to zero ... ten or twenty times ... ten tokens ... a hundred ... ten times less per token ... Doctor G R P O" |
| E1 policy gradient + baseline | policy gradient and baseline sections; B's final restatement |
| E2 PPO vs GRPO | "two networks, one trained ... G samples per prompt"; "a critic predicting" covered by "hard thing to learn" and value-model fragility; KL "in the loss ... from the reward" |
| E3 flat at forty | B "the reward goes flat at forty percent"; A "First, the dead-group fraction, and which kind ... the boring bugs" |
| E4 scaling | B "how does that scale"; A "prompts, times G, times answer length ... K V cache ... Long answers hurt twice ... separate GPUs" |
| E5 why verifiable rewards | verifiable-rewards section; "won't discover algebra"; ending "doesn't teach the model anything it never does" |
| G1 sources | "read the DeepSeekMath paper ... Spinning Up" |
| C1 closes loop | "the RL environment makes the tasks, the verifier makes the number" |
| C2 DPO on-policy | B "How's this different from DPO"; A "on-policy ... offline ... keep improving past its data" |
| C3 long-horizon | "One reward at the end of a hundred-step agent run is the same dead-group problem" |

Numbers checked against the lesson: R1-Zero 15.6 to 71.0; variance 20.8 vs 0.094, about 220x; mean gradients 0.19 / -0.06; plus 0.75 / minus 0.25; clip 0.8 / 1.2 / 0.2; one in sixteen gives 3.87 / -0.26; dead groups 66% / 44%; toy run 0.28 / 0.49 / 0.68 / 0.73, 35/64 to 59/64, 0.96 / 0.99 / 0.3%; beta 0.04; 4 ms at 273 GB/s; 1.4e14 FLOPs; 70-90%; 152k vocab, 54M logits, 27 GB; under 10 GB plus 1 GB; lr 1e-6 to 5e-6; 5% / 90%; KL under 0.1 nats.

Derived (said aloud, not written in the lesson): "fifteen failures to one success, square root of fifteen" (the 3.87 explanation); "point nine five multiplied by itself eight times, about two thirds"; "a push about fifteen times bigger" (3.87 / 0.26); "a hundred twenty-eight sequences of roughly three hundred fifty-six tokens is about forty-five thousand tokens"; "ten tokens vs a hundred tokens, ten times less per token" (illustrative); "'forty' gets maybe thirty percent" (illustrative distribution example).
