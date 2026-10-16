# Coverage: dpo

Every outline item -> where it lands in podcast/scripts/dpo.md (a few quoted words). No MISSING.

| Item | Lands in script |
| --- | --- |
| T1 prereqs re-explained | "Same as when you trained the tiny model from scratch"; "every parameter you train costs about sixteen bytes. Two for the weight..."; "the thing that capped a model on the Spark at about seventeen tokens a second"; "LoRA freezes the original weights and learns ... two thin matrices"; "Judges have a position bias" |
| P1 explanations scene | "write a short reason with it ... write a few hundred perfect explanations yourself" |
| P2 four minutes, tired style | "takes you, what, four minutes. After forty of them you're tired ... learns... your tired style" |
| P3 three seconds, two hundred vs twenty | "answer in about three seconds ... two hundred of those in the time it took you to write twenty" |
| P4 judging easier, wine critic | "Judging is easier than writing. It's like a wine critic" |
| P5 not a cross-entropy target, five years, one-line loss | B "So you just... train on the winner?"; A "isn't a target you can do cross-entropy against ... about five years ... one algebra trick" |
| O1 backflip, nine hundred clicks | "Paul Christiano and colleagues at OpenAI and DeepMind ... About nine hundred clicks" |
| O2 Ziegler, Stiennon, InstructGPT 1.3B over 175B, RLHF, ChatGPT | "Ziegler and colleagues ... Stiennon ... one point three billion ... hundred seventy-five billion parameter GPT three"; "made ChatGPT feel like an assistant" |
| O3 hard to run, Stanford May 2023, Zephyr, Tulu, Llama 3 | "couldn't get P P O to train stably ... May twenty twenty-three, Rafael Rafailov ... Zephyr, Tulu, and later Llama three's post-training" |
| I1 triple, terms | "There's a prompt ... the chosen response ... y w, for winner ... the rejected response" |
| I2 sky-blue, not wrong, nobody wrote perfect | "explain why the sky is blue to a ten-year-old ... Rayleigh scattering"; "Nobody wrote a perfect answer. Both of those came from a model" |
| I3 four to nine ranked, K(K-1)/2 | "between four and nine model outputs ... rank four answers, that's six pairs. Rank nine, and it's thirty-six" |
| I4 Bradley-Terry, sigmoid, Elo | "Nineteen fifty-two ... chess players and sports teams ... the sigmoid"; B "That's Elo, isn't it?" |
| I5 0 / +2 / +5, add a hundred | "Coin flip ... about eighty-eight percent ... about ninety-nine ... add a hundred to every single score, nothing changes" |
| I6 RM loss, logistic regression, ranker | "minus the log of that ... logistic regression on the difference"; B "that's my ranker loss" |
| I7 SFT | "S F T, supervised fine-tuning. It's just ordinary next-token training" |
| I8 reward model, six billion | "InstructGPT used a six billion parameter one ... prints one number" |
| I9 PPO, clipping | "proximal policy optimization, from Schulman ... clips every update" |
| I10 policy as distribution, objective | "A policy isn't one answer. It's a spread of probability over every possible answer ... output distribution" |
| I11 reference, KL, beta | "reference model. It's a frozen copy ... K L divergence ... Beta is the price of moving" |
| I12 reward hacking, KL leash | B "why have the second part at all"; A "reward hacking ... the K L leash is the main defence" |
| F1 pipeline diagram | "picture the whole pipeline drawn out ... four smaller boxes in a row"; "across the bottom, under a dashed line ... only two models" |
| I13 value model, advantage | "a value model for that, also called the critic ... That difference is the advantage" |
| I14 memory bill, generation engine | B "fifty-something gigabytes?"; A "about a hundred twelve gigabytes each ... about two hundred fifty gigabytes ... two Sparks' worth ... seventeen tokens a second" |
| I15 instability, knobs | "about a dozen knobs. The clip range, the K L coefficient ... repetitive nonsense... that the reward model loves" |
| I16 exact optimum, tilt, Z | "tilt them by the reward ... e raised to the reward divided by beta ... the partition function, written Z" |
| I17 optimum sketch, appendix | "minus beta times the K L divergence ... K L is never negative ... appendix A point one ... twenty minutes with a pen" |
| I18 beta as temperature | "It shows up like a temperature. Small beta ... extreme ... Large beta, the tilt is gentle" |
| I19 known before DPO, Z intractable | B "So we have the answer"; A "people knew it well before D P O. The problem is Z" |
| I20 flip, twice / ten times, title | "solve it for the reward ... twice as likely ... beta times log two ... ten times less likely ... secretly a reward model" |
| I21 Z cancels, add a hundred | B "Only differences"; A "Same prompt, same Z ... It's the 'add a hundred to every score' thing" |
| PR1 Predict z-cancels | A "Plug that reward formula into Bradley-Terry ... What's left"; B works it out; A "Four log-probabilities ... single forward pass ... No sampling" |
| I22 loss step by step, implicit rewards, margin | "Step by step. One ... Call that a ... implicit rewards ... reward margin ... squash it with the sigmoid ... minus the log" |
| I23 RM loss with ratio, passes | "reward model replaced by a ratio of two language models ... two forward passes on the policy ... one backward pass" |
| F2 four-box chain | B's chain; A "Four lines of algebra ... a column of boxes with arrows going down" |
| I24 interactive map, presets, beta slider | "Picture a little square map. a runs left to right, from minus six to plus six ... a beta slider and a few preset buttons ... 'step zero'" (Healthy and Wrong way presets not named; their points are the diagonal examples and the "has the pair wrong" case) |
| PR2 Predict step-zero | B "accuracy ... fifty percent?"; A "about point six nine three ... for any beta ... It's zero. Every pair is a tie ... strictly greater ... dropout" |
| I25 gradient weight, not SFT plus unlikelihood | "weighted by the probability that the policy currently has the pair wrong"; B "isn't that just S F T on the chosen answer"; A "the paper actually tried it ... the model degenerated" |
| I26 only difference, (+2,0) vs (-4,-6) | "a equals plus two, b equals zero ... a equals minus four, b equals minus six ... equally good" |
| I27 never zero | "The loss never reaches zero ... one or a few passes over the data, at a small learning rate" |
| I28 beta sets scale | "Drag the beta slider down ... push stays strong for longer ... Drag beta up ... saturates" |
| I29 two over beta, nats | "two divided by beta. At beta a half, that's four nats ... point one, it's twenty"; B "Nats?"; A "One nat is a factor of e" |
| I30 typical beta, interaction with lr | "point zero one to point five, and point one is the default ... A learning rate that's perfectly fine at beta point one can wreck the model at beta point zero one" |
| I31 caveat leash on data only | B "the leash works the same"; A "only on the data you train on ... measured on answers the policy itself writes" |
| I32 caveat optimum not reached | "assumed you actually reach the exact best policy ... what the loss is aiming at. Not where it lands" |
| I33 dashboard | "the chosen reward ... may drift up or down a little ... rejected ... goes down ... margin ... rise steadily. Accuracy, starts at zero ... plateaus ... Watch those"; held-out explanation |
| I34 sequence log-prob, chain rule | "the probability of the whole response is the product ... in log space it's the sum ... over the response tokens only" |
| F4 token row | "Picture one row of little boxes ... 'Deep', 'blue', a full stop, and an end-of-turn token ... a padding token ... zeros under the prompt" |
| I35 shift by one | "First, shift by one ... scoring every token against itself ... still trains. Badly" |
| I36 mask prompt, separate tokenization | B "you don't really need the mask"; A "only if both sequences keep exactly the same prompt tokens ... Tokenize the prompt and the response separately" |
| I37 sum not average, length root | B "Averaging seems cleaner"; A "that's a sum ... Some of the later variants do it on purpose ... one of the roots of a length problem" |
| I38 end-of-turn token | "include the end-of-turn token ... stops where it stops" |
| I39 overfitting, lr, IPO paper | "one to three epochs ... five times ten to the minus seven ... Ten to a hundred times lower ... Azar and colleagues ... ignores beta and drifts arbitrarily far" |
| I40 both log-probs fall | B "that's the whole point"; A "Often it goes down ... bottom-left region ... likelihood displacement" |
| I41 length exploitation | "chosen answer is longer on average ... cheapest feature ... Park and colleagues ... Alpaca Eval added a length-controlled win rate" |
| PR3 Predict length | A "Qwen two point five ... three hundred tokens ... What's the average after?"; B "four hundred?"; A "ten to fifty percent ... drops toward fifty percent ... check that it actually moved the model" |
| I42 IPO | "squared loss that pulls the margin toward a fixed target ... one over two beta" |
| I43 KTO | "single responses labelled good or bad ... prospect theory ... Thumbs-up, thumbs-down data is far more plentiful" |
| I44 SimPO | "Sim P O ... No reference model ... average token log-prob ... target margin, gamma" |
| I45 ORPO | "Or P O ... no separate S F T stage ... odds ratio ... in one pass" |
| I46 pattern, no winner, read originals | B "the ones that drop the reference are just better"; A "length normalization in one, the S F T loss in the other ... no consensus winner ... Including mine" |
| I47 offline, online, iterative DPO | "Everything so far is offline ... P P O is online ... iterative D P O"; GRPO fully online in close |
| B0 setup | "One Python environment for both, with torch, transformers and datasets, and later T R L and peft ... CUDA and its ARM processor" |
| B1 dataset | "binarized version of UltraFeedback ... Zephyr ... About sixty thousand prompts ... four model completions using ratings from GPT four"; "chat conversations, a list of messages" |
| B2 read twenty pairs | "read twenty pairs ... rough floor on how noisy your labels are" |
| B3 sequence log-prob hints | "Shift ... log-softmax ... gather ... float thirty-two ... about one point two gigabytes ... subtract the log of the summed exponentials" |
| B4 batch builder | "render the prompt with the model's chat template ... Tokenize the prompt and the response separately ... pad on the right ... cut the response, not the prompt" |
| B5 fake-model hand test | "random scores for one sequence of five positions, over a vocabulary of just seven tokens ... one part in a million" |
| B6 dpo_loss, log-sigmoid, no-grad | "returns the loss ... detached"; B "Why does that matter?"; A "the sigmoid rounds to exactly zero ... under no-grad" |
| B7 paper hand check | B "plus a half ... minus a half ... Margin's point one"; A "about point six four four four ... minus point zero four seven five ... point six four four three nine seven ... point six nine three one, for any beta" |
| B8 toy config, data, steps, predict | "vocabulary of fifty tokens, thirty-two positions, sixty-four wide, two layers ... sixty-four fake pairs ... three hundred D P O steps ... Does the chosen log-prob go up?"; B "yes?" |
| B9 real model, load twice, dropout | "Qwen two point five, the half-billion parameter instruct model ... about eight gigabytes ... load it twice ... switch dropout off" |
| B10 data split | "five thousand pairs ... under a thousand twenty-four tokens ... five hundred pairs from the test split" |
| B11 loop | "run the policy on the chosen sequences ... reference on both, under no-grad ... clip the gradient norm to one" |
| B12 hyperparameters, 156 steps | "AdamW at five times ten to the minus seven ... micro-batches of four ... over eight ... about a hundred fifty-six optimizer steps" |
| B13 precompute reference | "precompute the reference ... Compare the wall-clock time" |
| B14 LoRA reference trick, lr | B "where's the reference?"; A "the base model with the adapter switched off ... five times ten to the minus six up to five times ten to the minus five" |
| B15 agent review bugs | "reference computed with gradients ... off by one ... Padding counted ... misaligned after shuffling" |
| B16 eval setup | "a hundred fifty prompts ... Greedy, or temperature point seven with a fixed seed, up to five hundred twelve new tokens" |
| B17 judge both orders, length, truncation, read twenty | B "if D P O wins, done"; A "judged twice, with the order swapped ... average and the median length ... cut down to the shorter one's length ... read twenty pairs yourself ... Not the conclusion" |
| B18 TRL parity | "T R L's D P O trainer ... 'processing class' ... one fixed batch of eight pairs ... almost always tokenization ... same shape" |
| B19 done-when | folded: hand checks (B5, B7), toy curves (M2), step zero point six nine three and held-out (B12, M4), judge both orders (B17), parity (B18) |
| M1 what to record | "here's what you'd write down ... wall-clock time with the reference live versus precomputed" |
| M2 toy table | "Loss point six nine three ... minus point eight six ... point five nine ... point two two ... minus nineteen point seven ... minus nineteen point one and minus twenty-two ... point four four, margin point six ... minus twenty point three ... minus twenty-six point two" |
| M3 step fifty reading | B "Down?"; A "about forty-two percent ... two and a half chances in a hundred million ... even more absurd ... first twenty steps" |
| F5 toy plot | "you get two pairs of lines ... chosen ends about twenty nats below ... Its chosen line actually climbs" |
| M4 real expectations | "exactly point six nine three ... sixty to eighty ... disagreed with a fifth ... about eighty percent ... tens of nats ... a tenth of a nat per sequence" |
| K1 dropout | "point six nine six instead of point six nine three, and accuracy point three nine"; B "Before it's trained anything?"; A "training mode ... eval mode ... T R L turns dropout off by default" |
| K2 SFT term | B "also do S F T on the chosen answer?"; A "alpha ... one ... minus point zero eight ... ninety-two percent ... minus five ... D P O Positive from the Smaug paper ... keep alpha modest" |
| K3 prompt mask | "sum over the prompt tokens too ... loss barely changes ... Truncate long examples from the left ... credit for prompt text it didn't write" |
| K4 beta extremes | "beta point zero one with a learning rate of five times ten to the minus six ... margins explode ... beta one. The model barely moves" |
| E1 why preferences | Problem section (P2-P5), I2-I3 pair economics, and B's closing "better at picking ... than at writing" |
| E2 derivation without equations | B's chain after I23; B's closing restatement |
| E3 95% accuracy, chosen falling | B "ninety-five percent training accuracy"; A "Not necessarily ... check held-out accuracy ... Near-identical pairs are a known trigger" |
| E4 scaling to 70B | B "seventy billion"; A "roughly one point one terabytes ... roughly double ... orchestration is the hard part ... flip side" |
| E5 beta extremes | I28-I30 and K4 |
| G1 sources | "the D P O paper itself ... section four and that appendix, along with Nathan Lambert's free book" |
| C1 connections, GRPO question | "G R P O go back to sampling ... drop the value model ... did the code pass the tests ... what goes wrong in new ways?"; earlier connections re-explained inline (T1) |

Numbers checked against src/lessons/dpo.mdx: all lesson numbers match. Derived numbers not written in
the lesson: six and thirty-six pairs (four and nine answers); sixteen bytes split as two, two, four,
eight; four nats is a factor of about fifty-five and twenty nats about five hundred million; half a
billion parameters is about eight gigabytes trained plus one frozen; "half a millionth" for five
times ten to the minus seven.
