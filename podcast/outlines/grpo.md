# Outline: grpo

Source: src/lessons/grpo.mdx. Curriculum entry: "RL with verifiable rewards." Question: how does RL
with automatic rewards (like GRPO) teach a model to solve problems? Why: how current reasoning models
are trained; runs on one Spark at small scale. Build: train a small model with GRPO on your coding
environment and watch reward and behaviour change.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereq RL environment (reset, step, sandbox, reward from hidden tests). -> A re-explains in one breath when the setup words come up.
- T2 Prereq verifiers and reward hacking. -> A re-explains "a checker that's code, and the model gaming it" where reward hacking comes up.
- T3 Prereq DPO (pairs, offline, relative to a reference). -> A re-explains in the Problem and again in Connections.
- T4 Helpful: training memory math, bandwidth-bound decoding. -> re-explained in Build (memory) and Where the time goes (every decode step reads every weight).
- T5 Rough time: one evening to read, a weekend on the Spark. -> A, one line at start of Build.

## The Problem

- P1 A checker: Countdown puzzle, "use three, seven and four exactly once to make forty", returns one or zero; fast, never tired, can't be argued with; three plus seven, times four, is forty or it isn't. -> A opens on this scene.
- P2 Qwen two point five, half a billion parameters, instruct; solves some, fumbles the rest. -> A.
- P3 SFT needs worked solutions; you have none; a solver would teach imitation of the solver's style, not search; for coding tasks there's no solver. -> B proposes SFT (natural reach), A rejects.
- P4 DPO needs pairs; could sample two, keep pass/fail pairs; throws away most samples, trains offline on older-model answers. -> B proposes DPO, A explains.
- P5 What you have: a model that can try, a checker that can grade. No target tokens, no pairs. Cross-entropy needs the right next token; here only a verdict at the end. -> A.
- P6 Turning a verdict into a gradient is the whole problem; answer = policy gradient; GRPO makes it practical; works in 2025 because the checker is code. -> A signpost.

## Origin

- O1 RLHF: reward model on human preferences, optimise with PPO; InstructGPT 2022. -> A story.
- O2 PPO from robotics and games; brings a critic guessing at every token how well the answer will turn out; for a 7B policy that's another 7B network; hard to train when reward arrives at the end of a 500-token answer. -> A, with B asking why that's hard.
- O3 Feb 2024, DeepSeekMath (Shao et al.): replaced critic: sample a group, grade each against group average. Group Relative Policy Optimization. -> A.
- O4 Jan 2025, DeepSeek-R1: GRPO + rule-based rewards (answer right? format right?) straight on a base model, no supervised warm-up, learned long reasoning chains. R1-Zero: 15.6% to 71.0% pass@1 on AIME 2024, per the paper. pass@1 = fraction solved with one attempt per problem (averaged over several sampled attempts). -> A, numbers as words, pass at one defined inline.
- O5 Within months, labs and hobbyists reproduced on small models/toy tasks, often one machine. -> A.

## The Idea: setup in RL words

- I1 Policy = the model; given the text so far gives a probability for every possible next token. Written with weights theta. -> A, plain words, no symbols. Touches Gaurav's "output distribution" gap: B voices "the model outputs a token", A corrects: it outputs a distribution, sampling picks a token.
- I2 Prompt = situation; action = one sampled token; a completion is a sequence of actions; reward = number at the end, usually one for correct and zero for wrong. -> A.
- I3 Goal: raise the average reward over prompts and sampled answers, the expected reward, averaging over sampling randomness. That's what we take a gradient of. -> A.
- F1 Figure 1 THE LOOP: prompt into policy, G samples, verifier (plain code) scores them into rewards, advantages relative to group feed a gradient step back to policy; frozen reference copy connected by a KL leash. -> A describes like a diagram over the phone.

## The Idea: policy gradient from scratch

- I4 Scene: one puzzle, four answers, two pass. Passing ones more likely, failing less likely. -> A asks, B answers the obvious.
- I5 Log-probability of a completion = sum of per-token log-probs, from the same forward pass as cross-entropy. "Make this answer more likely" = step that increases its log-prob. -> A.
- I6 Do it for every sample weighted by how good it was: gradient is roughly the average over samples of goodness times gradient of log-prob. -> A in words.
- I7 REINFORCE (Williams 1992). Not a heuristic: exact unbiased estimate of gradient of expected reward. Reason: gradient of the probability equals probability times gradient of log-probability. -> A explains in words with small intuition. 
- I8 Can't differentiate through sampling or a Python verifier; don't need to; only differentiate log-probs. -> B voices wrong model "so you backprop through the checker?", A corrects.
- I9 SFT is "increase log-prob of answer"; policy gradient is same with a weight that can be negative. Policy gradient is SFT on your own samples weighted by how good they were. -> A, the line that sticks.
- I10 Code: loss is minus the mean of weight times completion log-prob. -> A in words: a minus sign because optimisers minimise.

## The Idea: noise and baselines

- I11 Plain REINFORCE uses raw reward. Shift: six for correct, five for wrong. Best direction unchanged, but every answer gets big positive weight; right on average because pushes cancel over many samples, but each batch is a tug of war between huge forces with small difference. -> A.
- PR1 Predict: four answers, uniform policy, answer zero correct, rewards six/five; single-sample estimates with raw reward vs reward minus average (five point two five). Same mean. How much bigger variance, 2x, 10x, 100x? Answer: ran numpy, 200,000 samples on Mac; means match within noise (about 0.19 for the right answer, about minus 0.06 for each wrong one); total variance 20.8 vs 0.094, about 220x. Subtraction changes nothing about what you estimate, almost everything about how many samples you need. -> A asks, B guesses ten, A reveals.
- I12 Baseline: number subtracted from reward; anything not depending on which answer was sampled is allowed and keeps it unbiased; good one is "the reward you expected". -> A.
- I13 Advantage = reward minus baseline; better than expected up, worse down, exactly as expected not pushed. -> A, name after idea.
- F2 Figure 2 WHY A BASELINE: left all four arrows up (six, five, five, five), gradient is small difference of big pushes, variance 20.8; right one arrow up plus 0.75, three down minus 0.25, variance 0.094. -> A describes.
- I14 Variance of gradient estimate = how much it jumps batch to batch; high variance points right only on average, each step mostly noise, need small LR and many steps. Variance is the enemy of RL; every algorithm from here is mostly a cleverer baseline. -> A.

## The Idea: PPO in one paragraph

- I15 PPO (Schulman et al. 2017) move one: learned baseline, value model / critic, often same size as policy, predicts from any partial answer the eventual reward; per-token advantage = how much better things went than the critic expected at this point; computed with GAE (blends critic predictions at successive tokens, a little bias for much less variance). -> A, GAE in one sentence.
- I16 Move two: samples come from policy at start of step; several gradient steps on them; policy drifts. Drift per token measured as probability ratio (new over old; one means unchanged). Clip: once a token's probability moved more than about 20% in the advantage's direction, gradient switches off. -> A.
- I17 PPO for LLMs holds four models: policy and value (trained), reward model and frozen reference (scoring). -> A, B counts it.
- F3 Figure 3 THE CLIP: good token: objective rises with ratio until 1.2 then flat, no gradient; bad token: pushing down helps until ratio below 0.8 then flat; dashed unclipped keeps pulling. -> A describes as two little graphs.
- I18 Formula: minimum of ratio times advantage and clipped ratio times advantage, clip range about 0.2. The min makes it pessimistic: credit only up to the clip, never rewarded for going past. Wrong-way move (good token got less likely) still has gradient pulling back. -> A in words.
- PR2 Predict: one gradient step per batch; what does clip do? Answer: nothing; every ratio exactly 1; gradient at ratio one is advantage times grad log-prob: REINFORCE with a baseline. Clip matters only reusing samples for several updates (TRL num_iterations; paper's mu) or when sampler and trainer disagree slightly (separate inference engine). With one update per batch a clip bug is invisible. -> A asks, B guesses "it stops big jumps", A corrects.

## The Idea: GRPO, grade on a curve

- I19 Value model is expensive, fragile, whole second LLM predicting a 0/1 that arrives after hundreds of tokens. GRPO: baseline from just asking again. -> A.
- I20 Group: G completions of same prompt, sampled independently from current policy, typically 4 to 64; unit for statistics. Advantage of answer i = (its reward minus group mean) divided by group std. -> A, formula in words.
- I21 Group mean is the baseline: fresh estimate of what this model usually gets on this exact prompt, now. No second network, no per-token guess. Every token of an answer gets same advantage. -> A.
- I22 Dividing by std is separate and debated (Break It); puts every prompt on same scale: easy prompt 7 of 8 pass, hard 1 of 8, similar total push. -> A.
- I23 Closed form for 0/1: k of G pass, p = k/G; correct gets square root of (1-p)/p, wrong gets minus square root of p/(1-p) (population std). One in 16: +3.87, failures -0.26. The rarer a success, the harder GRPO reinforces it. -> A worked example in words, no symbols.
- F4 Figure 4 interactive ONE GRPO STEP: top, G answers to one prompt (seventeen times twenty-four, verifier says 408), rewards, advantage bars (right up, left down); sliders G, pass rate, noise; std toggle; bottom 24 prompts same pass rate, zero-spread groups greyed out. Try pass rate 0.05 with G 4 then 16; add noise. -> A: "picture a slider" description.
- I24 Finding 1: zero-spread groups dead weight; all pass or all fail -> all advantages zero; you paid to generate. Chance = p^G + (1-p)^G. Checked against 200,000 simulated groups per setting, matched to three decimals. p 0.05, G 8: 66% dead; G 16: 44%. -> A, formula in words with worked example.
- I25 Finding 2: bigger G rescues hard prompts; more chances for one success, which gets a big push. -> A.
- I26 Finding 3: noise fakes signal; all-wrong group plus noise has nonzero std; tiny noise divided by tiny std comes out full size; trains hard on coin flips. Why reward must be verifiable: exact, deterministic, not a judge's mood. -> A, B voices "a little noise can't hurt".
- PR3 Predict: toy run 64 prompts, one right answer of 8; 16 easy, 16 hard (right answer under 1% to start), rest in between; G 8, tabular softmax, 60 steps. What happens to dead groups and hard prompts? Answer: numpy; accuracy 0.28 -> 0.49 (step 10) -> 0.68 (step 30) -> 0.73 (step 60), flattened. Dead groups 35/64 -> 59/64 by step 40. Medium solved (0.96), joined easy (0.99) as all-pass. Hard finished at 0.3%: never sampled right answer, no spread, never pushed. GRPO can only sharpen behaviour the model sometimes produces. Flat curve with frac zero std climbing toward one means dataset out of learnable prompts, not model done. -> A asks, B guesses hard ones get solved slowly, A reveals.

## The Idea: full GRPO loss

- I27 Per prompt, G completions from old policy (weights at start of step), advantages, minimise: average over answers of average over tokens of [clipped ratio term minus beta times per-token KL]. Ratio is per token new over old. -> A in words, no symbols.
- I28 Three ideas: PPO clipped policy gradient with group advantage in place of critic; one-over-length averages tokens within each answer (debated); a leash. -> A.
- I29 KL divergence: how different two probability distributions are; zero when identical. Reference model: frozen copy from before RL, never trains, answers "how likely would the original have found this token". -> A, plain words.
- I30 Without leash policy wanders anywhere that scores well, incl. degenerate text that passes. Beta sets leash length; DeepSeekMath used 0.04. -> A.
- I31 Odd formula is a KL estimator always non-negative, needs only sampled token's probability, not whole vocabulary (Schulman's note "Approximating KL Divergence"). -> A in words, with tiny worked example? keep in words.
- I32 GRPO puts KL in loss; PPO-style RLHF subtracts from reward. Some recipes (DAPO, recent TRL defaults) drop KL entirely for verifiable rewards; check your library. -> A.
- F5 Figure 5 WHAT LIVES IN MEMORY: PPO four networks, two trained; GRPO two networks, one trained, reference optional, reward is a Python function; price moves from memory to generation: G answers per prompt instead of one; one advantage per answer vs per-token from critic. -> A describes.

## The Idea: why verifiable rewards changed everything

- I32b RL on LLMs not new in 2025; the reward changed. -> A.
- I33 Learned reward model = network trained on human judgments; optimise hard, policy finds blind spots: longer, confident tone, flattery. Reward hacking (scoring high without doing the task). Sets a ceiling on how long/hard you can train. R1 paper says it avoided neural reward models for reasoning RL for this reason. -> A; re-explains reward hacking from verifiers episode.
- I34 Verifier for math answer or unit tests: cheap (microseconds to seconds), deterministic, much harder to fool (not impossible). Millions of steps. Tulu 3 report (AI2, late 2024) named it RLVR: reinforcement learning with verifiable rewards. -> A.
- I35 R1 stated carefully: from DeepSeek V3 Base, GRPO with only rule-based rewards (accuracy, format reward for reasoning inside think tags), response length grew steadily, re-checking and trying alternatives appeared; nobody wrote examples. R1-Zero problems: poor readability, mixing languages; released R1 used small cold-start supervised set, RL, more supervised, more RL. Not the first reasoning model (OpenAI o1 Sept 2024, no published method) but first to publish a recipe this simple; simplicity is why everyone could try. -> A, B pushes "so the model learned to reason from nothing?".
- I36 At your scale: RL with a verifier reinforces strategies the model can already sometimes find. 0.5B gets better at Countdown; won't discover algebra. -> A, sharp line.

## The Idea: what you watch

- I37 GRPO loss nearly meaningless: with one update per batch and group-centred advantages it hovers near zero however training goes. -> B voices "I'd watch the loss go down", A corrects.
- I38 Mean reward: on training batches and on fixed held-out set with greedy decoding; only the second shows real skill. -> A.
- I39 Reward std within groups and frac zero std: fraction of groups with no spread; "is there anything to learn" gauge; near one = too easy or too hard right now. -> A.
- I40 Response length: mean tokens and fraction hitting max (truncated). Some growth healthy on reasoning; racing to the cap is a disease. -> A.
- I41 KL to reference: should rise slowly; sudden spike = something broke out. -> A.
- I42 Entropy: how spread the next-token distribution is (in nats); slowly falls as model gets confident; crash to near zero = all samples identical, std zero, learning stops: collapse. -> A.
- I43 Clip fraction if more than one update per batch: share of tokens whose ratio hit the clip. -> A.
- F6 Figure 6 DASHBOARD (illustrative shapes, not measurements): reward up then flattens; frac zero std sick goes to one; length sick hits cap; KL slow creep vs spike; entropy sick crashes to zero. Reward rising while frac zero std heads to one = out of learnable prompts; length to cap with KL spiking = length explosion; entropy cliff = collapse. -> A, "picture five little charts", says shapes only.

## The Idea: where the time goes

- I44 Four phases: generate G completions per prompt, score, reference forward for its log-probs, train (forward and backward over prompt plus completion, optimiser step). -> A.
- I45 Scoring nearly free for Countdown, a few seconds per batch with a unit-test sandbox. Training: one big parallel pass over every token, compute-bound, efficient. Generation slow: one token at a time; every decode step reads every weight from memory so bandwidth-bound (re-explain); completions finish at different lengths, batch waits for longest. -> A, B voices "training is the expensive part, surely".
- PR4 Predict: Countdown, 0.5B, 16 prompts times 8 = 128 completions, up to 256 tokens, HF generate. Fraction of wall time generating? Answer: measure it in the build; rough: about 1 GB bf16 weights read per decode step is at least about 4 ms at Spark's ~273 GB/s spec-sheet bandwidth; in practice Python overhead in generate dominates at this size, often tens of ms per step; over 256 steps several seconds. Training about 6 x 0.5B x 45k tokens = about 1.4 x 10^14 FLOPs, a few seconds at realistic utilisation. Expect generation well over half, quite possibly 70 to 90%. Switching to a real inference engine (vLLM, SGLang) usually the biggest speedup; every serious RL framework embeds one. Fast inference is fast RL: batching, KV cache, prefix caching (G samples share one prompt), serving engines. -> A asks, B guesses, A works the numbers aloud.

## Build It

- B0 Everything on the Spark; plan: verifier, own GRPO loop on Qwen 0.5B instruct, compare to TRL GRPOTrainer, then coding env. -> A, one breath.
- B1 Why 0.5B instruct: small, fast, follows a format, succeeds sometimes (the requirement). If starting reward under ~5% or over ~90%, change puzzle difficulty first. 1.5B reasonable second run. -> A.
- B2 Task 0 setup: venv, torch, transformers, TRL, datasets, accelerate; check torch sees CUDA on ARM64 Blackwell; else NVIDIA container or NVIDIA's wheel index; pre-download the model. -> one sentence.
- B3 Memory: 0.5B full fine-tune bf16 + AdamW: ~1 GB weights + 1 GB grads + 4 GB fp32 Adam states (plus fp32 master weights with mixed precision), under ~10 GB, plus 1 GB reference. Real risk: logits; vocab ~152k, one sequence of 356 tokens has 54M logits; 128 in fp32 ~27 GB. Micro-batches. -> A works it aloud; B surprised.
- B4 Task 1 verifier given: makes puzzles by combining random numbers so a solution exists, target 1 to 200; prompt asks for expression in answer tags; checker takes last answer tag, numbers used must match exactly, safe evaluation only allowing arithmetic, integer literals; tests: correct passes; bare "40" fails; wrong numbers fail; import attempt fails; divide by zero fails; no tags fails. Three numbers easy, four much harder. Held-out 200 puzzles from a fixed seed, never trained on. -> A summarises what it checks and why.
- B5 Task 2 rollout + advantages (his to write): returns tokens, prompt length, completion mask, rewards, texts. Chat template; left padding so every completion starts at same column; generate with sampling, temperature 1, no top-p, G return sequences, samples land next to each other; sample from the real policy because the loss assumes it. Completion mask covers EOS itself and nothing after (off-by-one; check end-of-turn token). group_advantages three lines reshaping into groups; torch std defaults to unbiased; be consistent. Test: rewards 1,0,0,0 and 1,1,1,1 with G 4 -> first group nonzero summing to zero, second all zero. -> A, what matters and why.
- B6 Task 3 loss: token log-probs (micro-batched, plus entropy for logging). Shift: logits at position t predict token t+1; get it wrong and training looks plausible and learns nothing. Log-softmax in float, gather the chosen token, micro-batch to avoid 27 GB. Old and ref log-probs computed once after rollout without grad; with one update old equals detached current. Ratio = exp of difference; KL per token from d = ref minus current: exp(d) minus d minus 1. Advantage broadcast per sequence. Masked per-sequence mean then mean over sequences = paper's one-over-length. Sanity test: all three equal -> loss about minus mean advantage, about zero; gradient on each unmasked token = minus advantage over (N times answer length); KL gradient zero there. -> A in words, B asks why KL gradient is zero.
- B7 Task 4 loop: policy trainable bf16, ref frozen copy; AdamW lr 1e-6 (try 1e-6 to 5e-6; RL likes small LRs); 200 steps; 16 puzzles; rollout G 8; old/ref no grad; loss, backward, clip grad norm 1, step; log JSON line per step (reward mean, frac zero std, length, truncated, KL, entropy, clip frac, gen/ref/train time); every 20 steps greedy eval on 200 held-out + dump 4 samples. Hints: eval mode for generation with cache, train mode for update, dropout off; synchronize before timers (CUDA async); gradient checkpointing if needed; keep sample dumps at 0, 50, 100, 200; reading them is half the point. -> A.
- B8 Task 5 TRL GRPOTrainer: same task, seed, data; dataset of 5000 puzzles; reward function receives extra columns as keyword args; config num generations 8, max completion 256, lr 1e-6, beta 0.04, bf16. Look up: per-device batch size counts completions not prompts in recent versions; loss type and scale rewards defaults; what use vllm changes about time split. Agent may explain, comparison is his. -> A, by what it does.
- B9 Task 6 coding env: swap verifier for sandbox; single-turn: stub + description, completion is function, reward from hidden tests. Decide all-or-nothing vs partial credit; predict effect on frac zero std. Scoring now costs time: process pool for all completions, log score time. Agent reviews reward for gaming before the model finds it. -> A, B makes the partial-credit prediction.
- B10 Done when: 200 steps no NaNs, held-out greedy clearly above step 0; plot with six curves and point at the step something changed; samples from four points and describe the change; TRL run and explain differences; know generation fraction from own timers. -> A, compressed into "you're done when".

## Measure

- M1 Fill from logs, averages over 10 steps around step 0, 50, 100, 200, TRL at 200; time split per phase including TRL and optional TRL plus vLLM. -> A, one sentence, no table reading.
- M2 Reward rises then flattens; how far depends on start; plateau -> check frac zero std first; toy flattened at 0.73 with hard prompts below 1%. -> A.
- M3 frac zero std follows a U over pass rate: early dead groups mostly all-wrong, late mostly all-right; log which kind and watch the switch; compare against the formula with measured pass rate. -> A.
- M4 Length may rise or fall; settles where reward is easiest; "think briefly" matters; truncated answers have no tag, score zero: a length penalty you didn't write. -> A.
- M5 KL starts at exactly 0, creeps; with beta 0.04 and lr 1e-6, should stay well under 0.1 nats per token after a few hundred steps (rough expectation). -> A.
- M6 Entropy drifts down slowly: the model getting sure. -> A.
- M7 Generation should dominate with HF generate; if not, check synchronize; with vLLM it falls a lot; that gap is the argument for the inference track. -> A.
- M8 Read the samples: early answers ignore format, then reliably formatted, then try a combination, check, try again; write down first step with self-checking. -> A, ending of Measure.

## Break It

- K1 Remove baseline: A = raw reward; passing pushed up, nothing pushed down; still learns slower and noisier; with rewards five/six barely learns. The 220x, live. -> "what if you" exchange.
- K2 Sloppy verifier: reward 1 if target appears anywhere; within a few dozen steps model writes target and stops; reward near 1, strict held-out doesn't move. Reward hacking purest form; why held-out check is separate. Subtler versions with unit tests. -> B predicts, A confirms.
- K3 Starve the signal: 4-number (too hard) or 2-number (too easy); frac zero std to one, flat reward; raise G 8 -> 16 on hard set, groups come back to life; more samples buy signal with generation time. DAPO (2025) filtered dead groups and resampled. -> exchange.
- K4 Run wild: beta 0, LR 10-20x; entropy collapses, identical samples, std 0, learning stops; or one long template that sometimes passes and length runs to cap. Length bias: per-sequence mean vs sum divided by a constant; under per-sequence mean, long wrong answer penalised less per token than short wrong, nudging failures longer. Liu et al. 2025 "Dr. GRPO": this bias plus std division explain part of R1-style length growth. Run both, compare length. -> A works a tiny example (ten-token vs hundred-token wrong answer).

## Explain It Back (substance must appear)

- E1 Policy gradient to a supervised person: SL increases log-prob of a target; PG samples own answers, scores, increases log-prob of each in proportion to score; weights can be negative; unbiased estimate of gradient of expected reward; works though reward not differentiable. Baseline: big positive rewards -> noisy; subtract expected reward; average unchanged, variance down (220x toy). -> covered in policy gradient + baseline sections; B restates at the end.
- E2 PPO vs GRPO: value model about policy size predicting expected reward each token, trained alongside; GRPO uses group mean, every token shares one advantage; both clip + KL (PPO-RLHF in reward, GRPO in loss); GRPO saves memory and critic instability, pays G completions; good trade when reward is at the end since a critic predicting final 0/1 from partial text is hard anyway. -> covered GRPO + memory sections.
- E3 Reward flat at 40%: check frac zero std and which kind: all-wrong -> too hard, raise G, add easier prompts, filter dead groups; all-right -> exhausted, add harder. Read samples: truncation? entropy collapse? Hand-check verifier for false negatives (format mismatch) and false positives. Held-out vs training: overfitting or hacking. Then boring bugs: logit shift, completion mask, learning rate. -> A as a "here's how I'd debug a flat curve" walk after the dashboard / Measure, B sets it up with a real scenario.
- E4 Scaling: generation scales with prompts x G x length; decode bandwidth-bound so larger batch nearly free per token until compute-bound or KV cache runs out; KV cache grows with batch x length x layers and caps batch. Training scales with total tokens x model size (about 6 x params FLOPs/token), compute-bound. Long completions hurt twice: more decode steps, and batch waits for longest. Doubling model roughly doubles both. Money into inference: engine with continuous batching and paged KV cache, prefix caching, at scale separate GPUs for generation and training with weight syncing. -> A in the time section, after the predict.
- E5 Why verifiable rewards made it practical: learned RM has blind spots; stop early or short leash; verifier cheap, deterministic, harder to exploit, train longer; plus dropping the critic -> simple enough for one machine. Limit: only where code can check correctness; only improves strategies it sometimes finds. -> verifiable rewards section + ending.

## Go Deeper / Connections

- G1 Best sources: DeepSeekMath paper (where GRPO is introduced), OpenAI Spinning Up policy optimization intro (cleanest derivation). -> one closing sentence by A, before the final exchange or skip.
- C1 Closes loop with RL environments (produces tasks) and verifiers (produce the number). -> A sentence.
- C2 DPO vs GRPO: both push good up and bad down relative to a reference, DPO from a fixed dataset of pairs; GRPO samples fresh every step: on-policy (training on samples from the current model) vs offline; why GRPO keeps improving past its data and costs more compute. -> A, B asks the natural question.
- C3 Inference track is now training speed; long-horizon is the next wall: one reward at the end of a 100-step agent run is the same dead-group problem, much worse. -> A.

## Flow plan

1. Cold open on the checker and the puzzle; B reaches for SFT, then DPO; A shows why neither fits; "turn a verdict into a gradient".
2. Origin: RLHF, PPO critic, DeepSeekMath, R1-Zero numbers.
3. Setup words; B's "model outputs a token" -> distribution correction. The loop described.
4. Policy gradient: four answers, two pass; log-prob; REINFORCE; B's "backprop through the checker" correction; SFT-on-own-samples line.
5. Baseline: six/five shift, predict 220x, advantage, variance as enemy.
6. PPO: critic, GAE, ratio, clip, four models; the clip graphs; predict clip does nothing.
7. GRPO: group, mean/std, closed form one in sixteen, slider description, three findings, noise; plateau predict.
8. Full loss + KL leash + reference + estimator; memory picture.
9. Why verifiable: reward hacking, RLVR, R1 carefully, "won't discover algebra".
10. Dashboard; B's "watch the loss" correction; five charts.
11. Where time goes; B's "training is the expensive part"; predict + numbers; scaling answer.
12. Build: model choice, setup line, memory/logits math, verifier, rollout, loss (shift bug, sanity test), loop, TRL, coding env, done-when.
13. Measure expectations, reading samples; flat-at-forty debugging walk.
14. Break It four ways.
15. Connections (DPO on-policy, long-horizon) and sources sentence.
16. Ending: B restates, A sharpens (B slightly wrong: "teaches it to solve" -> "sharpens what it sometimes does; verdict into weight via group").
