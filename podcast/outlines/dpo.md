# Outline: dpo

Source: src/lessons/dpo.mdx. Curriculum entry: "Preference tuning with DPO." Question: how do you
train a model on "this answer is better than that one"? Why: he has read about DPO and PPO;
implementing DPO makes the loss function make sense.

Diagnostic gaps hit: he "knows DPO/PPO in theory" and does not know precisely what an "output
distribution" is, so the policy is said plainly as "a spread of probability over every possible
answer" before KL comes up. Memory math for models (bytes per parameter): the four-model PPO bill is
said slowly with the sixteen-bytes rule re-explained. Numbers: sigmoid values, nats, log-probs as
probabilities, all said with a comparison. B voices plausible wrong models: "chosen just gets more
likely", "train on chosen, push down rejected, done", "why not just keep the RLHF KL", "accuracy
starts at fifty percent", "average the token log-probs, it's cleaner", "the prompt cancels so include
it", "the judge says it won so it worked", "drop the reference to save memory, obviously better".
Earlier lessons re-explained in place: log-probs and cross-entropy (tiny-lm), sixteen bytes per
parameter (training-memory), memory-bound decoding at about seventeen tokens per second
(bandwidth-bound), LoRA's two thin matrices (lora), judges and position bias (llm-judges), his
pairwise cross-encoder ranker.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Today bullets not read; prereqs re-explained where they come up (list above). -> A, a sentence each.

## The Problem

- P1 Relevance-labelling model should write a short reason a reviewer can trust; first try: write a few hundred perfect explanations and fine-tune. -> A opens the scene.
- P2 Perfect explanation takes four minutes; after forty, tired, they sound the same, unsure the fortieth beats the model; model learns your tired style. -> A, story.
- P3 Colleague shows two side by side: three seconds, confident; two hundred comparisons in the time of twenty perfect answers; judgment of better sharper than ability to produce best. -> A; B recognises it.
- P4 Judging is easier than writing; wine critic. More signal per hour, about quality, not copying one person's phrasing. -> A, one exact comparison.
- P5 Catch: "A beats B" is not a target for cross-entropy; no single right answer. Five years of painful RL; twenty twenty-three, one algebra trick, a loss shorter than a sentence. -> B voices "just train on the winner"; A gives the catch.

## Origin

- O1 Twenty seventeen, Christiano and colleagues (OpenAI, DeepMind): simulated robot backflip; humans clicked the better of two clips; small network learned to predict clicks, used as reward for RL; about nine hundred clicks. -> A, story.
- O2 Moved to language: GPT two on preferences (Ziegler, twenty nineteen), summarization (Stiennon, twenty twenty), InstructGPT (Ouyang, twenty twenty-two): one point three billion model preferred over the hundred seventy-five billion GPT three it came from. Reward model plus PPO = RLHF; made ChatGPT feel like an assistant. -> A; B reacts to the size gap.
- O3 Notoriously hard; many labs could not get PPO stable. May twenty twenty-three, Rafailov, Sharma, Mitchell and colleagues at Stanford, "Your Language Model is Secretly a Reward Model": reward model and RL loop folded into one supervised loss. Within months Zephyr, Tulu, later Llama three's post-training used DPO or a relative. -> A.

## The Idea

- I1 Preference triple: prompt (x), chosen (winner), rejected (loser; need not be bad, only worse). -> A, terms inline.
- I2 Sky-blue example: chosen explains sunlight as a mix of colours for a ten-year-old; rejected says Rayleigh scattering inversely proportional... Rejected not wrong, worse for the audience. Nobody wrote a perfect answer; both from a model; human only picked. -> A describes, no JSON read.
- I3 InstructGPT labellers ranked four to nine outputs per prompt; K answers give K times K minus one over two pairs (four gives six, nine gives thirty-six). -> A with worked example.
- I4 Bradley-Terry (nineteen fifty-two, chess players and sports teams): hidden quality score per response, the reward; people noisy; chance of picking A = sigmoid of score difference; Elo is the same idea. Sigmoid explained in words. -> A; B connects to Elo.
- I5 Difference zero = coin flip; plus two = about eighty-eight percent; plus five = about ninety-nine. Only differences matter; add a hundred to every score, nothing changes. Hold onto that. -> A, numbers with feel.
- I6 Reward model loss = minus log sigmoid of (winner score minus loser score): logistic regression on a difference. Exactly a pairwise ranker loss: his cross-encoder trained on (query, better doc, worse doc) is a Bradley-Terry reward model by another name. -> B makes the connection; A confirms.
- I7 Pipeline stage one SFT: supervised fine-tuning, next-token training on human demonstrations; teaches format. -> A, term inline.
- I8 Stage two reward model: sample from SFT model, people rank, train (InstructGPT used a six billion one) with Bradley-Terry loss; reads prompt + response, prints one number. -> A.
- I9 Stage three RL with PPO: proximal policy optimization (Schulman twenty seventeen), improves from sampled attempts, clips each update. -> A, term inline.
- I10 Policy: the model choosing next token, written pi; a spread of probability over every possible answer (output distribution, said plainly). Objective: expected reward minus beta times KL from reference. -> A; this is where "output distribution" is nailed.
- I11 Reference model: frozen SFT copy. KL divergence: how differently two models spread probability, zero when identical. Beta = price of moving. -> A, terms inline.
- I12 Why the KL term: reward model is a learned approximation from tens of thousands of comparisons; pushed hard, policy finds blind spots: high-scoring garbage = reward hacking. KL leash is the main defence. -> B "why not just maximize reward"; A explains.
- F1 Figure 001: top, InstructGPT pipeline; stage three box with four models (policy trained, reference frozen, reward frozen, value trained), sample, score, KL, advantages, clipped update, repeat with generation in the loop. Bottom: DPO, same SFT, pairs only no reward model, two models, log-probs of fixed pairs, no sampling. -> A describes like a diagram over the phone.
- I13 Why PPO heavy: four models. Value model (critic): predicts how much reward is still coming from a point in a response; turns one end-of-answer reward into a per-token signal, the advantage (better or worse than expected). -> A, terms inline.
- I14 Memory: sixteen bytes per param trained with Adam in mixed precision (re-explained), two bytes frozen in bf16. Seven billion: two trained at about a hundred twelve gigabytes each, two frozen at fourteen each, about two hundred fifty before activations; two Sparks' worth. Plus a fast generation engine because stage three samples every step: slow memory-bound decoding (about seventeen tokens per second on the Spark). -> B guesses low; A builds the bill.
- I15 Instability: samples from current policy, learned reward, learned value chasing moving target; a dozen knobs (clip range, KL coefficient, value loss weight, temperature, reward scaling); wrong settings give no error, just a model sliding into repetitive nonsense the reward model loves. -> A.
- I16 Key insight: over all possible policies, which scores best? Exact answer: reference probabilities tilted by e to the reward over beta, divided by Z. Partition function: sum over every possible text, makes it add to one, nobody can compute it. -> A, in words with a tiny example.
- I17 Why that's the optimum: objective rewrites as minus beta times KL from the tilted distribution plus a piece that doesn't depend on the policy; KL never negative, zero only when equal. Appendix A point one, twenty minutes with a pen. -> A, short sketch in words.
- I18 Beta as temperature: small beta, extreme tilt, piles on highest-reward answers; large beta, gentle, near reference. -> A.
- I19 Formula known before DPO; useless because Z sums over all text; can't sample or evaluate; that's why RL. -> B "so we have the answer?"; A: can't use it.
- I20 Flip it: solve for the reward: reward = beta times log of (optimal over reference) plus beta log Z. In words. Twice as likely -> beta log two plus constant; ten times less -> beta log a tenth plus constant. Policy is the reward model; title. -> A with worked example.
- I21 Z depends only on prompt; Bradley-Terry only looks at differences; same prompt, same Z, cancels. -> A ties back to "add a hundred".
- PR1 Predict z-cancels: plug into Bradley-Terry, what's left? Answer: Z terms cancel; four log-probs of specific known texts (chosen and rejected under policy and reference); each one forward pass; no sum over texts, no sampling. -> A asks, B works it out.
- I22 Loss step by step: a = chosen log-prob policy minus reference; b same for rejected; beta a and beta b = implicit rewards (term: only meaningful vs another response to same prompt); difference = reward margin, positive means agrees with human; sigmoid = probability implicit RM agrees with label; minus log; average over batch. -> A walks it in words.
- I23 It's the reward-model loss with the reward model replaced by a ratio of two LMs. No sampling, value model, reward model, RL loop. Two forward passes on policy, two on frozen reference, one backward. -> A; B reacts.
- F2 Figure 002: four boxes down a column: objective (be good, stay close), exact optimum (tilt by reward), solve for reward (policy is a reward model), into Bradley-Terry (same prompt, same Z), arrow to DPO loss. -> A, one breath recap as a chain.
- I24 Loss sees only a, b, beta, so it can be drawn completely. Interactive figure: square map, a across, b up; colour = loss; diagonals are contours; arrow shows the gradient; presets Step 0 (centre), Healthy (a one and a half, b minus two), Both fell (a minus two and a half, b minus five and a half), Wrong way (a minus one, b plus one); beta slider; readouts margin, rewards, probability, loss, push. -> A, "picture a little slider".
- PR2 Predict step-zero: loss on every pair at step zero? Fraction correct? Answer: log-ratios zero, margin zero, sigmoid half, loss ln two about point six nine three for any beta; accuracy zero, every pair a tie (strict greater-than, TRL and dashboards). First logged point should read loss point six nine three, accuracy zero, margin zero; otherwise policy and reference differ, usual culprit dropout. -> B guesses fifty percent accuracy (wrong model); A corrects.
- I25 Gradient: push chosen up, rejected down, equal amounts, weighted by sigmoid of (rejected reward minus chosen reward) = probability the policy currently has the pair wrong. Right by wide margin: almost no push; wrong: hardest. That weight separates DPO from "SFT on chosen plus unlikelihood on rejected", which the paper tried and found degenerates. -> B voices "isn't it just SFT on chosen, push down rejected"; A corrects.
- I26 Only the difference matters: (plus two, zero) and (minus four, minus six) equally good. Matters in Break It. -> A, with the two points said slowly.
- I27 Loss never reaches zero; rewards bigger margin forever; on a clear pair pushes margin to infinity unless stopped; one or a few epochs at small learning rate is what stops it. -> A.
- I28 Beta sets the scale: small beta, same log-ratio margin earns small reward margin, loss stays high, push strong longer, policy moves further; large beta saturates quickly, push dies, stays near reference. -> A, with the slider.
- I29 What beta means: the two views agree. Reward margin two (eighty-eight percent sure) needs log-ratio margin two over beta: beta point five, four nats; beta point one, twenty. Nat explained (one nat = factor of e, about two point seven). -> A with worked example; B asks what a nat is.
- I30 Typical beta point zero one to point five; point one default in paper and TRL. Lower = aggressive, risk weird text; higher = gentle, may not move behaviour. Most important hyperparameter after learning rate; they interact: a learning rate fine at point one can wreck the model at point zero one. -> A.
- I31 Caveat one: DPO keeps the model close only on the data you train on; RLHF's KL is measured on the policy's own answers everywhere; far from the dataset the model can drift unmeasured. -> B "so it's the same leash"; A corrects.
- I32 Caveat two: derivation assumes the exact optimum; a real network trained one epoch on a few thousand pairs doesn't reach it; the algebra says what it aims at, not where it lands. -> A.
- I33 Dashboard: rewards chosen (mean beta a; starts zero, may move a little either way), rewards rejected (starts zero, goes down), margins (starts zero, rises steadily), accuracies (starts zero, rises fast, plateaus), logps chosen/rejected (watch: see Break It), loss (starts point six nine three, falls). Accuracy = implicit RM agrees with the label; on train nears a hundred percent and says little; held out says whether it generalizes. -> A, said as a few things you watch, not a table.
- I34 Sequence log-prob: chain rule; log-prob of the whole response = sum of each token's log-prob given the prompt and the tokens before; response tokens only. Three details that have bitten real implementations. Log-probs re-explained (tiny-lm). -> A.
- F4 Figure 004: one row of tokens: user, Name, a, color, assistant marker, then Deep, blue, full stop, end-of-turn, then a pad. Logits at each position predict the next token; mask zeros on prompt and pad, ones on response including end-of-turn; sum over the ones is one number. -> A describes the row.
- I35 Shift by one: output at position t guesses t plus one; compare all but the last logit with all but the first id; mask shifts with labels. Forget it: each token scored against itself, a large meaningless number that still trains, badly. -> A; no slicing syntax.
- I36 Mask the prompt: it cancels in a minus b only if both keep exactly the same prompt tokens; pollutes the logps you watch. Tokenize prompt and response separately and join the ids; tokenizing the joined string can merge tokens across the boundary. -> B "it cancels anyway, so who cares"; A corrects.
- I37 Sum, don't average: true log-prob is a sum; averaging is a different objective (SimPO and ORPO on purpose). Long response much more negative, its log-ratio can move more, just more tokens: one root of the length problem. -> B voices "average is cleaner"; A corrects.
- I38 Include the end-of-turn token: the model learns the chosen answer stops where it stops. -> A.
- I39 Overfitting: one to three epochs, learning rate around five times ten to the minus seven for full fine-tuning (ten to a hundred times lower than SFT). Longer: train accuracy a hundred percent, margins climb, held-out stalls, text strange (loss always wants bigger margin). IPO paper (Azar twenty twenty-three): near-deterministic preferences, DPO's optimum ignores beta and drifts arbitrarily far. -> A.
- I40 Both log-probs fall: expect chosen up; often goes down with rejected, rejected faster. Bottom-left of the map. Probability went to responses in neither column; sometimes harmless, sometimes worse than both. Studied as likelihood displacement. Will be made to happen in Break It. -> B surprised; A explains.
- I41 Length exploitation: chosen longer on average because raters like thorough answers; DPO learns the cheapest separating feature; train on UltraFeedback, length likely goes up; a judge that likes length reports a win that's partly words. Park et al. twenty twenty-four measured it; AlpacaEval added length-controlled win rate. -> A.
- PR3 Predict length: Qwen two point five half-billion instruct, five thousand UltraFeedback pairs, three hundred tokens mean on a hundred held-out prompts before. Guess after, and how judge win rate changes when truncated to equal length. Answer: no number to look up, measure; direction longer, ten to fifty percent not surprising; equalized win rate drops toward fifty percent, what's left is the real part; no length increase means check it moved (margins rising, held-out above fifty). -> A asks, B guesses, A gives the reasoning.
- I42 IPO (Azar twenty twenty-three): squared loss pulling log-ratio margin toward a fixed target, one over two beta in TRL's convention; margins can't grow forever. -> A.
- I43 KTO (Ethayarajh twenty twenty-four): single responses labelled good or bad, no pairs; prospect theory from behavioural economics; reference point estimated from the batch; thumbs-up/down data far more plentiful. -> A.
- I44 SimPO (Meng, Xia, Chen twenty twenty-four): no reference; average token log-prob as implicit reward; target margin gamma inside the sigmoid; saves reference memory and compute; length normalization counters length bias. -> A.
- I45 ORPO (Hong, Lee, Thorne twenty twenty-four): no reference, no separate SFT stage; log-odds-ratio penalty added to ordinary SFT loss on chosen; one pass. -> A.
- I46 Pattern: two drop the reference, replacing the anchor with length normalization or the SFT loss. Recipes add an SFT term on chosen to DPO, fighting falling log-probs. No consensus winner; comparisons depend on tuning; close when well tuned. DPO is the baseline, which is why you implement it. Read originals before trusting one-line summaries. -> B "drop the reference, obviously better"; A: no winner.
- I47 Offline (fixed dataset collected beforehand, usually another model) vs online (model generates fresh samples during training; PPO and GRPO). Iterative DPO: generate pairs from current model, label with judge or reward model, DPO, repeat; some of RL's learn-from-own-mistakes without PPO machinery. GRPO goes fully online. -> A, terms inline.

## Build It

- B0 Setup: a dpo folder in his workbench; torch, transformers, datasets, accelerate; later trl and peft. Core runs on the Mac in seconds; training on the Spark; PyTorch build matching the Spark's CUDA and ARM. -> one sentence.
- B1 Dataset: ultrafeedback binarized from Hugging Face H four (the one Zephyr used), about sixty thousand prompts, chosen and rejected picked from four model completions using GPT four ratings; train prefs and test prefs splits; check the card for columns. Peek script prints prompt, chosen, rejected, scores (chosen and rejected are chat message lists). -> A.
- B2 Read twenty pairs, count disagreements: rough floor on label noise; comes back when held-out accuracy plateaus. -> A; B guesses how many.
- B3 sequence_logps (his to write): inputs logits, ids, response mask; returns one number per sequence. Hints: shift; log-softmax then pick out the actual token's log-prob (gather); do it in float thirty-two (bf16 loses precision summing hundreds of small numbers, and two models are compared); memory: hundred-fifty-thousand-token vocabulary over two times a thousand twenty-four positions is about one point two gigabytes in fp32; alternative: picked logit minus log-sum-exp avoids the full table. -> A, said as what it does.
- B4 Batch builder: chat template with the generation prompt, as text; tokenize prompt and response separately; append end-of-turn to response; concatenate ids; build mask; right-pad; truncate the response, not the prompt. -> A.
- B5 Hand test: fake model, random logits for one sequence of five positions over a seven-token vocab, five ids, mask on the last three; sum the log-probs at positions two, three, four by hand; match to one in a million. -> A.
- B6 dpo_loss (his): four log-prob batches plus beta; returns loss and the two rewards, detached. Hints: log-sigmoid, not log of sigmoid (sigmoid underflows to zero, log gives minus infinity); reference log-probs carry no gradient (no_grad or detach). -> A; B asks why log-sigmoid.
- B7 Paper hand check: policy chosen minus ten, rejected minus twelve; reference minus ten and a half, minus eleven and a half; beta point one. a plus half, b minus half; rewards plus and minus point zero five; margin point one; loss about point six four four four; gradient on chosen about minus point zero four seven five, plus for rejected; equal and opposite. PyTorch gave point six four four three nine seven and point zero four seven five zero two. Equal inputs give point six nine three one for any beta. -> A and B work it through together.
- B8 Toy: tiny GPT two from a config, no download: vocab fifty, thirty-two positions, sixty-four wide, two layers, two heads, all dropout zero. Sixty-four synthetic pairs: random four-token prompt, random six-token response, chosen and rejected identical except the last token (one vs two). SFT briefly on both so no preference; that's the reference; deep-copy into the policy. Three hundred DPO steps, AdamW, learning rate one ten-thousandth, beta point one, full batch; print every twenty-five. Predict: does the chosen log-prob go up? Keep it for Break It. -> A; B predicts yes (wrong model), payoff in Measure.
- B9 Real run: Qwen two point five, half-billion instruct (one point five billion also fits), full fine-tune on the Spark; loaded twice: policy training, reference frozen in eval with grads off, both bf16; disable dropout in the policy too or step zero won't read point six nine three. Memory feel for half a billion (derived: about eight gigabytes trained plus one frozen). -> A.
- B10 Data: five thousand train pairs filtered so prompt plus longest response is under a thousand twenty-four tokens; five hundred test pairs for held-out accuracy. -> A.
- B11 Loop: for each batch, policy on chosen and rejected, reference on both under no-grad, loss, backward, clip gradient norm to one, step, log every ten. -> A in words.
- B12 Hyperparameters: beta point one; AdamW at five times ten to the minus seven; effective batch thirty-two pairs (micro-batch four, accumulate eight); warmup ten percent; one epoch, about a hundred fifty-six steps. Log the six metrics plus held-out accuracy and margin every fifty steps. -> A, with the step count worked out.
- B13 Upgrade one: precompute the reference log-probs once; then the reference needn't be in memory; compare wall clock. -> A.
- B14 Upgrade two: LoRA (two thin matrices re-explained); reference = base model with the adapter switched off, one copy of weights; LoRA wants larger learning rate, five times ten to the minus six to five times ten to the minus five; check LoRA paper and TRL docs. -> B "where's the reference then?"; A.
- B15 Agent review for classic bugs: reference with gradients, shift or mask off by one, padding counted, chosen and rejected misaligned after shuffling. -> A.
- B16 Eval: hold out a hundred fifty test prompts never trained on; one answer each from base and DPO, same decoding (greedy, or temperature point seven with fixed seed, max five hundred twelve new tokens). -> A.
- B17 Judge: pairwise, each pair judged twice with order swapped; win only if both orders agree, else tie (position bias re-explained). Record mean and median length in tokens. Rejudge with both truncated to the shorter at a sentence boundary: crude length control. Read twenty yourself. Agent reviews the judge prompt and swap logic, not the conclusion. -> B "the judge said it won, done"; A.
- B18 TRL parity: same model, pairs, hyperparameters, sigmoid loss type; ref model none makes TRL create a frozen copy; API moves fast, tokenizer argument renamed processing class. Compare step zero (point six nine three, margin zero), log-probs on one fixed batch of eight pairs (should agree closely; mismatch is almost always tokenization: chat template, end-of-turn, truncation side), curves (same shape, similar values, not identical: data order, padding, numerics). Agent may explain, find the line yourself. -> A.
- B19 Done when: hand checks pass (point six four four four and point six nine three one); toy curves explainable; half-billion run logs six metrics, starts at point six nine three, has held-out accuracy; judge both orders with length and length-controlled rerun; log-probs match TRL on a fixed batch or you can name why. -> folded into the flow, not read as a list.

## Measure

- M1 Things to fill in for the real run (and TRL): step-zero loss, final train loss, held-out accuracy and margin, change in chosen and rejected log-probs, mean length before and after, judge win/tie/loss both orders, same with lengths equalized, wall clock with live vs precomputed reference. -> A, said as what you'd write down.
- M2 Toy run on the Mac: step zero loss point six nine three, accuracy zero, margin zero, chosen minus point eight six, rejected minus point eight five. Step fifty: point five nine zero, accuracy one, margin point two two, chosen minus seventeen and a half, rejected minus nineteen point seven. Step one hundred: point five five nine, margin point two nine, minus nineteen point one and minus twenty-two. Step three hundred: point four three nine, margin point six, minus twenty point three and minus twenty-six point two. -> A as "when I ran it", key rows only, with feel.
- M3 Step fifty reading: accuracy perfect, loss falling as designed, chosen went from minus point eight six (probability about forty-two percent) to minus seventeen and a half (about two and a half in a hundred million). "Prefers" chosen only because rejected is even more absurd. Bottom-left corner, measured. Most collapse in the first twenty steps. -> B's prediction payoff; A.
- F5 Figure 005: log-prob over three hundred steps; plain DPO chosen and rejected both crash, chosen ends about twenty nats below the reference; with SFT term chosen climbs toward zero and only rejected falls. -> A, described as two pairs of lines.
- M4 Real-run expectations (not measurements): step zero exactly point six nine three, else bug (dropout, not identical, mismatched batches). Held-out accuracy clearly above fifty, well below a hundred; sixty to eighty plausible; Task-zero disagreement is a rough ceiling (disagree with a fifth, expect at most about eighty). Rejected falls clearly; chosen may fall, much milder than toy, often slightly below start; chosen falling by tens of nats means learning rate too high or beta too low. Length goes up; big win-rate drop when equalized means much of the win was length. Parity: step-zero log-probs differing by more than about a tenth of a nat per sequence, look at tokenization first. -> A.

## Break It

- K1 Dropout back on (GPT two default point one): step-zero loss point six nine six instead of point six nine three, accuracy point three nine instead of zero. Policy in training mode and reference in eval mode are different models at step zero, log-ratios are noise. TRL disables dropout by default. Small on a toy; on a real run, noise in every margin. -> A, "what if you...".
- K2 SFT term on chosen: add alpha times the length-normalized negative log-prob of chosen, alpha one. Chosen went from minus point eight six up to minus point zero eight (probability about ninety-two percent), rejected still fell to minus five, accuracy stayed one. Anchors the absolute level, which DPO never looks at. Same idea as an NLL term in iterative reasoning DPO and DPO-Positive in the Smaug paper. Trade-off: back to imitating chosen text, so keep alpha modest on real data. -> B suggests the fix; A gives numbers and trade-off.
- K3 Forget the prompt mask: loss barely changes (cancels), but logps jump much more negative and stop meaning response log-prob. Then left-truncate long examples so chosen and rejected keep different amounts of prompt: no cancellation, credit for prompt text it didn't write. -> A.
- K4 Beta point zero one with learning rate five times ten to the minus six on the half-billion model: margins explode, both log-probs dive, text drifts into repetition or odd formatting while the dashboard looks great. Beta one: barely moves. Both ends of the leash. -> A; B reacts.

## Explain It Back (substance, no quiz)

- E1 Why preferences: judging cheaper and more reliable than writing; seconds per pair even when you couldn't write the best; K answers give K times K minus one over two pairs; says what not to do; quality relative to alternatives the model actually produces, not copying phrasing. -> covered in Problem and I3; B restates.
- E2 Derivation in four steps without equations. -> F2 chain and B's closing restatement.
- E3 Ninety-five percent train accuracy with chosen falling: not necessarily working; gap only; mass elsewhere; check held-out (may be overfitting), read generations, length, judge vs reference; fixes: lower learning rate or fewer steps, higher beta, SFT term, chosen and rejected less similar (near-identical pairs a known trigger). -> A in Measure/Break It wrap.
- E4 Scaling half a billion to seventy billion: DPO one trained model at about sixteen bytes per param plus frozen reference at two, reference droppable by precomputing; seventy billion roughly one point one terabytes plus activations: many GPUs but ordinary supervised infrastructure. PPO: two trained plus two frozen, about double, plus generation inside every step, slow, bandwidth-bound, separate inference engine kept in sync with trainer weights; at seventy billion the orchestration is the hard part. Flip side: DPO only knows collected pairs; PPO keeps learning from its own outputs. -> B asks the scale question; A answers.
- E5 Beta extremes. -> I28-I30 and K4.

## Go Deeper / Connections

- G1 The DPO paper (section four, appendix A point one) and Nathan Lambert's free RLHF book. -> one sentence.
- C1 Builds on tiny LM, training memory, LoRA, LLM judges; Bradley-Terry ties to the ranker. Next: GRPO, back to sampling from the model being trained like PPO, drops the value model, reward is a check you can run like "did the code pass the tests"; question to carry: what goes wrong when the reward is a unit test. -> A, closing turns.

## Flow

1. Problem: labelling explanations, the four-minute vs three-second scene (P1-P5).
2. Origin: backflips, InstructGPT, then the Stanford paper (O1-O3).
3. Pairs and the economics (I1-I3).
4. Bradley-Terry, numbers, ranker connection (I4-I6).
5. RLHF pipeline, policy as a distribution, KL, reward hacking (I7-I12), diagram (F1).
6. Why PPO is heavy: four models, memory bill, instability (I13-I15).
7. The trick: exact optimum, sketch, beta as temperature, Z is the problem (I16-I19).
8. Flip it, Z cancels, Predict (I20-I21, PR1).
9. Loss step by step, chain recap (I22-I23, F2).
10. The interactive map, step-zero Predict, gradient, diagonals, never zero, beta (I24-I28, PR2).
11. What beta means, nats, caveats (I29-I32).
12. Dashboard (I33).
13. Sequence log-probs and the three bugs (I34-I38, F4).
14. Failure modes and the length Predict (I39-I41, PR3).
15. Variants, offline vs online (I42-I47).
16. Build: data, the two functions with hand checks, toy prediction (B0-B8).
17. Build: real run, upgrades, eval with judge, parity (B9-B19).
18. Measure: toy numbers and what they mean, real expectations (M1-M4, F5).
19. Break It (K1-K4), then the diagnosis and scaling answers (E3, E4).
20. Close: next topic, B restates the core, A sharpens (C1, G1, E2).
