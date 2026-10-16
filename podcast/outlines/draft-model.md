# Outline: draft-model

Source: src/lessons/draft-model.mdx. Curriculum entry: "Train your own draft model." Question: can I
distill a small model that predicts what my big model will say? Why: connects training back to
inference; a better draft means faster speculative decoding.

Related episode already exists: podcast/scripts/speculative-decoding.md. That episode fully explains
the output distribution, the accept-or-reject rule (big over small, capped at one), the residual, the
proof of exactness, alpha, K, c and the speedup formula, KV cache rollback, Medusa/EAGLE in one line
each. This episode refers back briefly and re-explains only what is needed to follow (so he never
has to pause), then spends the time on what this lesson adds.

Diagnostic gaps touched (CLAUDE.md): numbers / memory sizes (the 640 GB vs 0.78 GB logit storage,
bytes per draft step, FLOPs per token); "doesn't know what output distribution means precisely" and
"why spec decoding is exact" (recap in one breath: the list of odds, the rule keeps the output
exact whatever the draft does); "why decoding is memory-bound" (Medusa output-layer bandwidth, shallow
vs deep draft). B voices the natural wrong model "a better draft is a smarter model".

Each item: what the lesson teaches -> how it is said aloud.

## Prerequisite recaps (brief)

- R1 Output distribution = the list of odds over ~128k tokens at each step; target's list called p, draft's q. -> A, one or two sentences, early in The Idea.
- R2 Accept-or-reject rule: keep the draft's guess with probability big over small, capped at one; on reject sample the leftovers; output is exactly the target's distribution whatever the draft is. -> A, "the accept-or-reject rule from speculative decoding, the one that keeps the output exact".
- R3 alpha = acceptance rate; K = guesses per round; c = draft step cost over target step cost; speedup = tokens per round over (one plus K times c). -> A, brief, in the opening scene.
- R4 Decode is bandwidth-bound: every step reads all weights; 8B is 16 GB at about 273 GB/s. -> A, at the truncated draft and Medusa bandwidth points.
- R5 Teacher forcing / verify is a mini prefill. -> A, at offline alpha.

## The Problem

- P1 Where the K sweep ended: 1B drafting for 8B, greedy, alpha about 0.7, c about 0.3, best K 2 or 3, about 1.4x. Real gain. -> A opens on this.
- P2 Two levers left: lower c (CUDA graphs, fused kernels on the draft step) or raise alpha (better draft). -> A.
- P3 Print the rejections: 20 rounds where d1 was thrown out. "Here's a" vs "Sure"; markdown header before a list vs straight to "1."; math.pi times r squared vs 3.14 times r times r. -> A tells them as a scene, code said in words.
- P4 None of the 1B's guesses are wrong; fine English, working Python; just not what this 8B would say; different writer with own habits asked to impersonate one it never studied. -> A; B voices "so it needs to be smarter".
- P5 Reframe: you don't need a smarter draft, you need a better impersonator; you own the 8B, it shows its work including full probability vector at every step; copying a big model's probabilities has a name, older than LLMs. -> A.
- PR1 Predict: Draft A, a brilliant 1B that beats the 8B on a reasoning benchmark, vs Draft B, worse at everything but trained to copy the 8B's probabilities. Answer: almost certainly B; acceptance rewards agreeing with the target, not being right; a better-answering draft proposes tokens the target wouldn't and they're rejected; the output is exactly the target's whatever the draft is, so the draft's quality as a writer is invisible, only similarity shows, as speed; a brilliant 1B can be a bad draft. -> A asks, B picks A (wrong), A reveals.

## Origin

- O1 2006: Bucilua, Caruana, Niculescu-Mizil; best classifiers were ensembles of hundreds of models, too slow; "Model Compression": label a large pile of unlabeled data with the ensemble's outputs, train one small net to reproduce them; most of the accuracy at a fraction of the cost. -> A, story.
- O2 2015: Hinton, Vinyals, Dean, "Distilling the Knowledge in a Neural Network", modern form and name; teacher's wrong answers carry information: "dog 0.9, wolf 0.09, car 0.0001" says looks a bit like a wolf, nothing like a car; one-hot "dog" throws that away; "dark knowledge"; added temperature knob. -> A; B reacts to the wolf.
- O3 Spec decoding (2022) made a setting where this matters most: draft's only job is to match the teacher's distribution. 2023 DistillSpec (Yongchao Zhou et al., Google): distill drafts for spec decoding, 10 to 45% more speedup than undistilled. 2024 Medusa (Tianle Cai et al.) and EAGLE (Yuhui Li et al.): small drafting modules reading target's internal state. You build the first, taste the second. -> A.

## The Idea: what a good draft is

- I1 P(keep) averaged over draft proposals = sum over tokens of min(p, q): the shared part of the two bar charts. -> A in words, re-derive with one token example (draft proposes 40%, kept 25/40 of the time = 25% = smaller of the two).
- I2 Total variation distance (TV) defined: half the sum of absolute differences; largest possible difference in probability the two give any single event; 0 identical, 1 no overlap. -> A, with a tiny worked example.
- I3 Identity: for any two numbers, |p - q| = p + q - 2 min(p, q); summed, TV = 1 - sum of min; so alpha = 1 - TV. Leviathan states it; checked numerically on random 50-token distributions, agree to 16 digits. -> A in words ("the gap between two numbers is their sum minus twice the smaller"), worked example with 0.4 and 0.25.
- I4 Read as design spec: acceptance at one step is a pure function of how far apart the two vectors are; not of how good the draft is; average over steps your server sees = alpha in the speedup formula; to raise alpha make q close to p on the text your server writes. That's the whole job. -> A.
- I5 Easy vs hard tokens: after "The capital of France is", both put 0.8+ on Paris: huge overlap. After "Here is a poem about", both spread over hundreds of tokens; overlap of two spread-out distributions with different preferences is small; draft is "wrong" only as in different taste. -> A; B connects to the rejections they printed.
- F1 Figure 001 (interactive): eight-token vocab, next token after "def area(r): return": math, r, 3, pi, open paren, None, 0, self. Target bars vs draft bars; solid blue = shared min, wash = draft over-proposes, dashed = under-proposes. Start alpha 0.63; over-proposing None and self costs as much as under-proposing math. Distill slider halfway (0.50): alpha 0.82, KL from p to q drops 0.32 to 0.08 nats; K 3, c 0.3: speedup about 1.2x to about 1.6x; same size, same c, it imitates better. Push K up: best K grows, long runs survive; raise c: slow draft eats the gain. Fully distilled q = p: every draft kept, only c limits; no real draft gets there. -> A describes like over the phone.

## The Idea: learning from the teacher's whole answer

- L1 Obvious way: 8B writes lots of text, fine-tune 1B on it with ordinary LM loss. Works; called sequence-level distillation (Kim and Rush 2016): student trained on teacher-generated full outputs with normal next-token loss. 1B learns "Here's a", the markdown header. -> A.
- L2 Cross-entropy defined: minus log of the probability the model gave the token that actually came next. One-hot label: 1 for one entry, 0 for all others. -> A inline.
- L3 What one example tells the student: 8B sampled " math", label says math 1, everything else 0; but 8B knew math 0.46, r 0.14, 3 0.10...; sampling threw nearly all away. -> A.
- L4 Knowledge distillation defined: train student to match teacher's output probabilities; target = whole vector = soft labels ("soft" because spread). Loss = KL divergence: how different two distributions are, in nats, zero only if identical, never negative, not symmetric. -> A; B asks "nats" -> natural-log units.
- L5 KL(p||q) = cross-entropy against p (whole vector as the label) minus the teacher's own entropy, a constant the student can't change. So distillation loss = the loss you already know with a soft label. Gradient wrt student logits q - p, same shape as q - onehot. One line of code changes. -> A in words, B voices "so it's a totally different training setup" and A corrects.
- L6 Why it matters: a one-hot label is one sample from p; student must see the same kind of context many times before the counts reveal p's shape; soft label hands it p directly. -> A.
- PR2 Predict: 300 contexts, vocab 1,000, spread-out teacher; lookup-table student; n examples per context; one-hot vs soft; alpha at n=1 and n=64? Answer (numpy): one-hot 0.12 at n=1, 0.39 at 16, 0.64 at 64, only 0.81 at 256; soft: alpha = 1 after one example. Real nets share across similar contexts, shrinking the gap a lot, but direction holds; why KL run beats CE run on the same 8B text. Each soft label worth many hard ones. -> A asks, B guesses, A reveals.

## The Idea: temperature and T squared

- T1 Trained distributions are peaky: 0.97 on one token, tiny amounts on the rest; the tiny amounts carry the dark knowledge but barely touch the loss. -> A.
- T2 Distillation temperature: divide both models' logits by T > 1 before softmax; T 2 or 4 flattens, small entries visible. Side effect: gradients shrink by about 1 over T squared, so multiply loss by T squared. -> A in words.
- T3 For a draft, careful: Hinton wanted knowledge, judged on top answer; you want to match the distribution at the temperature you serve, since alpha is computed there; flattened-matching student optimizes something slightly different. Start at T = 1; if try T = 2 measure alpha at serving temperature, not 2. Break It does this. -> A; B pushes "but more signal is good".

## The Idea: which way round the KL goes

- K1 KL not symmetric; two directions push differently when student too small to copy perfectly, which a 1B imitating an 8B always is. -> A.
- K2 Forward KL(p||q): weighted by teacher's p; huge where teacher has real probability and student almost none; student covers everything, spreads thin; mode-covering. What Hinton used; what soft-label cross-entropy computes. -> A.
- K3 Reverse KL(q||p): weighted by student's own q; huge where student puts mass on something teacher thinks unlikely; doesn't care what student ignores; hides inside teacher's biggest peak; mode-seeking. MiniLLM (Gu et al. 2024) argued for it for LLMs. -> A.
- K4 Which matches acceptance? Neither exactly. alpha = 1 - TV, TV symmetric: same charge for a unit of probability in the wrong place either direction. Both KLs bound TV (Pinsker's inequality: TV at most square root of KL over 2, either direction): driving either to zero drives alpha to 1. At the student's limit they disagree about which mistakes to make, which changes alpha. Two students with same KL can have quite different TV. -> A; Pinsker said in words.
- F2 Figure 002: teacher two bumps over 40 bins; student one bump (a mean and a width); grid search best student per objective; reports alpha and whether student's top = teacher's top. Second bump 0.35: forward KL straddles, alpha 0.557, top token in the valley; reverse KL takes big bump 0.650; maximize alpha directly 0.656, close to reverse. Second bump 0.50: forward 0.558 beats reverse 0.500; direct alpha agrees with forward; giving up half the mass too expensive. Greedy column: greedy acceptance = top tokens match; forward KL's straddler can fail that badly even with fine alpha at T 1. Direct alpha: right target, but gradient only says above or below, not by how much, rough training signal; most train with a KL and measure alpha. -> A described like over the phone.
- K5 Real students aren't one-bump toys, effect milder. DistillSpec: best divergence depends on task and decoding (greedy or sampling, which temperature); no universal winner; a measurement, not a debate. Build trains forward KL (standard, easiest with stored logits); try others cheaply; can even train on 1 - sum min directly; DistillSpec includes TV among losses compared. -> A.

## The Idea: whose text to learn on

- W1 Distillation needs contexts: prefixes where you ask the teacher "what would you say next?" -> A.
- W2 Draft is used after real (target-written) text for d1, and after real text plus its own earlier guesses for d2..dK. Want good on target's text, on prompts like your traffic, and on its own half-finished guesses. -> A.
- W3 Choice 1 generic text: wrong prompts, wrong writer. Choice 2 target's generations on prompts like your traffic: right prompts, right writer; off-policy = text produced by some other process than the model being trained; cheap once, reused; student never sees its own mistakes. What you build. -> A.
- W4 Choice 3 on-policy distillation: student writes, teacher reports vector at every position of student's text, student trained toward those (Agarwal et al. 2024, GKD; used by DistillSpec). Fixes exposure bias: trained only on someone else's text, never seen prefixes with its own typical slips; at d2..dK it reads exactly that. -> A; B asks why you'd train on the worse writer's text.
- W5 DistillSpec: student-generated data did as well or better than teacher data, and cheaper since the small model writes. Catch: plumbing; regenerate as student changes, teacher running during training; Spark fits both (16 GB plus a few); stretch task. -> A.

## The Idea: the dataset and top 64

- D1 Figure 003 pipeline: about 10K prompts like your traffic -> 8B generates, batched, T 1 -> text, about 2M tokens, 8 MB -> 8B re-reads it, one prefill per sequence -> top-64 per token, 388 bytes not 250 KB -> train draft (a) CE on text, (b) KL on top-64 -> offline alpha, sum of min, held-out -> spec decoder -> scoreboard. Stretch on-policy: draft writes, 8B scores live. Generate once, score once, train many times. -> A as a spoken pipeline.
- D2 Habit from memory math: multiply it out before writing code. -> A.
- PR3 Predict: 10,000 answers of about 200 tokens = 2M positions; Llama 3 vocab 128,256; full logits in bf16? top 64 as id plus value? Answer: 128,256 x 2 bytes = 250 KB per position; x 2M = about 640 GB; more than the Spark's 128 GB, slow to stream every epoch. Top 64: id needs 4 bytes (int32) because 128,256 doesn't fit in 65,535 of a 2-byte uint16; value 2 bytes fp16; 64 x 6 = 384 bytes plus 4 bytes for one more number = 388 bytes; 0.78 GB total; about 660 times smaller; fits in RAM. -> A asks, B works it, maybe tries 2-byte ids (wrong), A corrects.
- D3 logsumexp: log of sum of exp of logits over whole vocab, softmax normalizer; with it any single logit becomes an exact probability. 64 stored logits become 64 exact probabilities; one minus their sum = exact tail mass over the other 128,192 tokens. Without it, renormalize the 64 to sum to 1, quietly claiming teacher puts zero everywhere else. -> A; worked example.
- D4 Is 64 enough? If student matched renormalized top-k perfectly, alpha = teacher's top-k mass exactly (student gives top-k a bit more than p each; shared part is all of p's top-k). Average top-64 mass is roughly a ceiling on what stored logits can teach; you'll measure. Peaky chat text likely high, with a tail of open-ended positions where not. Keeping tail mass as its own "everything else" bucket recovers a little. -> A, worked example (top-64 holds 0.95 -> alpha 0.95).
- D5 Why store vs run 8B live: training step for 1B about 6 x 1.2B = about 7 GFLOP per token (forward and backward); one 8B forward about 2 x 8B = 16 GFLOP per token; live teacher roughly triples each epoch of every experiment. Score once and store is cheap and reusable; live teachers for on-policy where text keeps changing. -> A, B asks "why not just run it live".

## The Idea: what shape should a draft be

- S1 Figure 004 four ways: A separate small model; B truncated target; C Medusa heads; D EAGLE. Bytes per draft step are bf16 spec-sheet arithmetic. -> A signposts.
- S2 A: Llama 3.2 1B, 16 layers, 2048 wide, 1.24B params, about 2.5 GB read per draft step, sees only tokens; tied embeddings (same matrix for input lookup and output layer; 1B does it, 8B doesn't). Hard rule same tokenizer (id 1234 means same string to both); Llama 3.2 and 3.1 share one; check anyway as common.py does. -> A.
- S3 B: truncated target: keep embedding, first N layers, final norm, output layer; drop N+1..32. N = 4: each 8B layer about 218M params (attention projections plus big MLP), 4 layers 0.87B; output layer 4096 x 128,256 = about 525M params, 1.05 GB bf16, read every step; embedding a lookup, one row per token. Total about 2.8 GB per step, a bit more than 1B's 2.5. -> A, numbers spoken.
- S4 Why bother: shallow and wide: 4 layers not 16, a quarter of the per-layer kernel launches; at batch 1 time partly set by sequential layer count; the c measurement probably showed the 1B far slower than its bytes predicted for this reason. Second: starts inside the target: same embeddings, output layer, first 4 layers literally the target's; in same process point draft's embedding and head at target's tensors, zero extra memory; freeze those, train only 4 layers. -> A; B: "but more bytes means slower" (bandwidth wrong model), A corrects with launch overhead.
- PR4 Predict: untrained truncated 4-layer copy; last layer output straight into 8B's final norm and output layer, skipping 28 layers; alpha? Answer: much worse, likely terrible; output layer trained to read the hidden state after layer 32; after layer 4 the state is in very different form, early layers still working out what tokens are, not what comes next; "logit lens" (apply output layer to intermediate layers) shows mostly nonsense or echo the input token. Expect alpha far below 1B until trained. Point: how much can a few hours teach 4 layers to do the job of 32; measure before and after. -> A asks, B guesses "decent, it's the real model's own layers", A reveals.
- S5 C Medusa heads (Cai et al. 2024): drop separate draft; target already computes final hidden state at every position during verify; bolt tiny heads on it; head k takes h at t, predicts token at t + k + 1. Each head a residual block: h plus SiLU(W h), SiLU a smooth ReLU-like curve, W 4096 x 4096 (17M params), then own output layer copy. Head 1 two ahead, head 2 three ahead, all from same h. Train on target's own text, target frozen (Medusa-1) or jointly fine-tuned (Medusa-2). Ride on verify pass: c close to zero. -> A.
- S6 Medusa trade: head 2 guesses three ahead without knowing the two in between; per-head accuracy falls fast with distance; compensates with top few candidates per head and tree attention (verify several continuations in one pass as a tree with attention mask so each branch sees only ancestors). Paper: about 2.2x Medusa-1, 2.3 to 3.6x Medusa-2. Caveat: for sampling Medusa's default "typical acceptance" is a relaxation, not exactly the target's distribution; with greedy or the standard rejection rule, exact. -> A; B: "blind guessing".
- S7 D EAGLE (Li et al. 2024): among strongest practical methods; token-only draft must rebuild everything the target worked out; EAGLE's draft is one transformer layer reading the target's top-layer features plus next token's embedding, predicts next feature vector, turns into token via target's output layer, loops on its own predicted features. Sees what the target was "thinking". EAGLE-2: draft tree shape depends on draft's confidence. EAGLE-3: trains draft on its own predictions, same idea as on-policy. vLLM and SGLang ship EAGLE support. -> A.
- S8 You build A and B, C as stretch; D natural next step; the target's hidden state is a far richer input than a few tokens, you'll feel it in Medusa. -> A.

## The Idea: measuring a draft without running speculation

- M1 Full decoder per candidate slow and noisy; shortcut from the identity. -> A.
- M2 Held-out target text, both models over it with true prefix at every position = teacher forcing (feed true previous tokens, so every position scored in one parallel pass; same mini-prefill trick as verification). Both full vectors at every position; sum of min there = exact probability first draft of a round is kept there; average = offline alpha; no sampling noise from coin flips. Exact for first draft position; approximation for later. -> A.
- M3 For greedy: top-1 agreement = fraction of positions where draft's most likely token = target's; acceptance for greedy spec decoding; compute on held-out text target generated greedily. -> A.
- M4 Offline alpha used to compare training runs; real decoder confirms and adds positions 2..K (draft's own guesses in prefix) and c. -> A.
- PR5 Predict: offline top-1 agreement 0.80; real greedy decoder K 4, acceptance per draft position (kept when judged). Does position 1 match 0.80? Position 4 higher or lower? Answer: position 1 matches closely, same question, real target prefix; small differences from prompt mix and bf16 noise. Later either way: d4 judged only when d1-d3 kept, mostly in easy stretches (boilerplate, end of word, code syntax), pushes conditional acceptance up; but conditioning on own guesses pushes down slightly; on chat easy-stretch often wins, flat or rising; also why measured tokens per round don't match the independent-alpha formula. -> A asks, B guesses "lower, errors compound", A reveals.

## Build It

- B0 Folder: inference/draft with prompts, generate, score_topk, offline_alpha, train_draft, onpolicy, medusa; spec folder sweep gains per-position stats; checkpoints. Models: Llama 3.1 8B Instruct teacher/target, Llama 3.2 1B Instruct student; same NVIDIA PyTorch container. Memory: 1B in bf16 with AdamW about 16 bytes per param for weights, grads, optimizer state, about 20 GB plus activations; training-memory lesson; comfortable on 128 GB with 8B alongside. -> A, setup in a few sentences; B asks where 16 bytes comes from, A short answer pointing to later lesson.
- B1 t1 prompts like your traffic: chat-style; public chat-prompt collection, UltraChat 200k common; check license and card; mix in real request logs if any, best possible data. Keep first-turn prompts of reasonable length, dedupe, drop benchmark prompts, shuffle, 10,000 train, 500 held-out. Held-out only for measuring alpha, never trained on; benchmark prompts neither, or scoreboard measures memorization. -> A.
- B2 t2 8B writes training text: 10,000 answers at batch 1 at 13 tok/s would take about two days; batch it; vLLM offline mode (fallback HF generate batch 32-64 with left padding, slower). Max 256 tokens. Run three times: train at T 1, held-out at T 1, held-out greedy. Store token ids not strings: re-tokenizing decoded text can split differently and logits line up with wrong tokens. Why T 1 though serve greedy: sampled text covers more contexts; KL target is whole distribution anyway, learns what 8B would do at every branch; if scoreboard greedy-only, extra run on greedy text fair experiment. Note generation time = 8B batched throughput. -> A.
- B3 t3 score once: 8B one forward over prompt plus response (teacher forcing); for each position predicting a response token keep top-64 logits, ids, logsumexp of full row. Alignment: row i predicts token i+1; response starts at s = prompt length; rows s-1 through len-2, one per response token. Write to three preallocated memmap files plus offsets. topk and logsumexp in fp32. One at a time fine (about 400-token prefill, far from memory-bound) or batched. Record top-64 mass per position; mean and 10th percentile; close to a ceiling. Self-check: on a greedy sequence the 8B's top stored id should equal the response token on most rows; if only a few, off by one. -> A; off-by-one said in words with a tiny example.
- B4 t4 offline alpha of the off-the-shelf draft: held-out, teacher-forced, both models, softmax fp32 full vocab; mean sum of min, mean top-1 match, mean KL, per-position array. Use held-out T1 for alpha, greedy held-out for top-1. Use full logits (500 sequences small enough live), not stored top-64, so the measurement doesn't share the training approximation. Histogram: big spike near 1 (easy) and long spread below (taste). -> A.
- B5 t5 train two ways: one script, two losses, same data, steps, LR; only loss changes so fair. (a) CE on 8B text. (b) forward KL over stored top-64 plus one tail bucket: student log-softmax over full vocab, pick at teacher's top-64 ids, teacher probs from stored logits minus logsumexp; tail p = 1 - sum, tail q = 1 - sum; add tail term; times T squared. Stored logsumexp only valid at T 1; other T renormalize top-k and drop tail: another reason to stay at T 1. Loop: response tokens only (mask prompt), packed/padded about 512, AdamW, LR about 1e-5 short warmup cosine decay, bf16 weights, 1-2 epochs over 2M tokens. Chunk logits: batch 8 x 512 positions x 128,256 x 4 bytes = 2.1 GB fp32 logits. Log loss and every few hundred steps offline alpha on 50 held-out. Cost: 2M x 2 epochs x 7 GFLOP = about 30 PFLOP; few tens of TFLOP/s -> tens of minutes per run; measure tok/s first 100 steps and predict run time. Agent review for classic bugs: prompt not masked, off by one, tail sign flipped, T squared missing. -> A.
- B6 t6 truncated draft: deep copy target, keep first 4 layers, set layer count; share and freeze embedding, output layer, final norm; train only layers. Deep copy needs 16 GB more briefly; check forward pass and cache length. Measure offline alpha before training (as predicted); train with KL from t5, same data, higher LR 5e-5 to 1e-4 (a lot to learn); measure again; time one draft step vs the 1B's in same eager setup; faster per step even though more bytes? -> A.
- B7 t7 stretch on-policy: best KL-trained 1B continues on its own text; each outer step student samples answers (batched T 1), 8B loaded alongside scores each sequence, KL step. GKD in simplest form. Generation slow: short max new tokens (128), big batch. Few hundred steps; compare offline alpha and especially acceptance at positions 2-4 vs off-policy KL draft; DistillSpec claims it helps; check on your traffic. -> A.
- B8 t8 into decoder and scoreboard: extend sweep with per-position counts: judged (all earlier kept) and kept; acceptance = kept over judged. Sweep: off-the-shelf 1B, CE 1B, KL 1B, trained truncated, on-policy if done; record alpha estimate, per-position, tokens per round, c, speedup, best K. Best one into the spec server (load checkpoint instead of stock 1B, nothing else changes); same benchmark (concurrency 1, 4, 16; 200 requests; 256 tokens; ignore EOS); scoreboard row with offline alpha, alpha estimate, K in notes, directly under last lesson's speculative row. Agent review. -> A.
- B9 t9 stretch Medusa: three heads guessing 2, 3, 4 ahead from 8B's final hidden state, used as draft in greedy spec. Data math first: 2M positions x 4096 x 2 bytes = about 16 GB bf16; fits RAM; collect once (output hidden states; check last entry is after final norm: output layer of it must equal logits); train without running 8B again; fast. Head: h plus SiLU(W h), W initialized to zero so it starts as identity; then 8B's frozen output layer. Paper gives each head its own trainable output layer copy: on bandwidth-bound Spark adds 1.05 GB reads per head per step; three heads about 20% on every 16 GB verify pass. Sharing frozen output layer avoids it; stack three heads' outputs, multiply by output layer once, read once. Small accuracy for bandwidth trade; note choice. Drafting: verify pass returns the row that produced fix/bonus token; take that hidden state, run three heads, argmaxes are next d1, d2, d3; next verify feeds fix token plus d1-d3. No draft model, loop, cache rollback. Expect head 1 best, each later worse; compare with distilled 1B. -> A; B checks the 20% number.
- B10 Done when: derive alpha = sum min = 1 - TV and explain "imitate not be good"; top-64 dataset size matches prediction with mass stats and passing alignment check; offline alpha table for all drafts; per-position acceptance and K sweeps; scoreboard row. -> folded into Build It/Measure talk, not read as list.

## Measure

- E1 Dataset: 10,000/500 prompts; response tokens; batched throughput; disk size predicted about 388 bytes x tokens, within a few percent or something padded; top-64 mass probably high on average for chat with long low tail; if mean well under 0.9, try k = 128; scoring time. -> A.
- E2 CE vs KL: both raise alpha over off-the-shelf (both teach habits); KL beats CE at the same steps, by more on alpha at T 1 than on top-1 agreement (CE on sampled text already decent for top token). DistillSpec 10 to 45% extra speedup published range; several points of alpha reasonable hope. Measure. -> A.
- E3 Truncated: near-useless before, improves a lot after; whether it passes the 1B depends on how much 4 layers learn from 2M tokens; starts with target's representations but far fewer params doing work than 16 layers; c may be noticeably lower in eager PyTorch; whichever wins, comparison is the lesson. -> A.
- E4 Offline vs online: offline top-1 matches position-1 greedy acceptance within a couple of points; later positions flat or rising common, selection reason. -> A.
- E5 Speedup: c 0.3, alpha 0.7 -> 0.8 takes best speedup about 1.37x (K 2) to about 1.55x (K 3). c 0.15: about 1.75x to 2.1x. Distilled draft helps more the cheaper the draft step; this lesson and lower c multiply. -> A; B: "so the two levers multiply".
- E6 Medusa: head 1 may rival distilled 1B's position-1 acceptance or fall short; heads 2, 3 clearly worse, blind; c near zero so modest acceptance can win; no tree verification leaves some gain; fine for first build. -> A.
- E7 Scoreboard: tok/s at concurrency 1 rises by about ratio of new speedup to old; throughput at 16 still bounded by lock; faster per request, not wider. -> A.
- E8 Offline alpha table includes T = 2 Break It row and on-policy row; decoder table: plain = 1.00 tokens per round, 1.00 speedup. -> implicit.

## Break It

- X1 Off by one: shift teacher rows by one relative to student. Loss still goes down (scary): student learns to predict the token after next, possible, just hard. Offline alpha collapses. Falling loss proves learned something; only alpha tells right thing; keep the t3 self-check. -> exchange.
- X2 Hinton's temperature, wrong job: distill at T 4 (renormalized top-64, times T squared), measure alpha at T 1 and top-1. Student matched flattened distributions, spreads too much probability at serving temperature, alpha drops, especially at T 1. Distillation temperature is a choice about what to copy; for a draft, copy what you serve. -> exchange.
- X3 Top-1 only: k = 1, drop tail; that's CE against teacher's argmax, one-hot again (different from sampled token). Alpha at T 1 falls back toward the CE run while top-1 holds or improves. Soft part is exactly what makes a draft good at sampling. -> exchange.
- X4 Leak the benchmark: add benchmark prompts with 8B answers to training; scoreboard speedup jumps; run on fresh 20 chat prompts never seen, comes back down. Drafts memorize; speedup on training prompts is a speedup on your test, not your traffic. Real servers see repeats, which is why caching and n-gram lookup exist, but different claim, measure as one. -> exchange.

## Explain It Back (substance must appear)

- Q1 What makes a draft good: kept with probability sum min = 1 - TV; only closeness on served text; better-answering draft gets rejected; output exactly target's so quality only shows as speed; imitation. -> Predict PR1 + I4 + closing.
- Q2 Logits beat text: one-hot = one sample; soft label gives whole p; KL = CE with p label minus constant; gradient q - p vs q - onehot; toy 1 soft = exact vs 64 one-hot = 0.64; real nets smaller gap. -> L5, L6, PR2.
- Q3 Forward or reverse: covering vs seeking; acceptance is symmetric TV, both bound it; differ at limit; two-bump toy: reverse won with dominant bump, forward with equal; greedy spread student can miss top; depends on task and decoding; start forward, measure at serving temperature, try others. -> K section + F2.
- Q4 Scale to 1 billion tokens: full logits 1B x 250 KB = 250 TB impossible; top-64 at 388 bytes = about 390 GB, disk yes, Spark memory no, stream; teacher scoring 16 GFLOP/token = 1.6 x 10^19 FLOPs, many hours to days on one box; generating slower still, decode expensive; student 7 GFLOP/token; on-policy looks better (student generates cheaper, teacher only scores), shard across GPUs; diminishing returns: alpha capped by what a 1B can represent, bigger draft or EAGLE-style beats more tokens; at high serving batch the speedup shrinks, value depends on load. -> dedicated exchange (B asks "how does this scale").
- Q5 Medusa vs draft model: draft sees own guesses so acceptance stays decent ahead but costs separate sequential pass per token (c 0.15-0.4 on your box) and separate KV cache; Medusa rides verify pass, c about 0, no second cache, cheap to train on cached hidden states, but head k guesses k+1 ahead blind, falls fast; tree verification. Single-user bandwidth-bound box where c is biggest problem: heads attractive. Need long accepted runs or can't modify serving forward: separate draft simpler. EAGLE between: reads features like Medusa, drafts autoregressively like a draft model, usually wins on acceptance. -> exchange after EAGLE.
- Q6 Why own generations: guesses 2..K follow draft's own guesses; exposure bias; on-policy trains on exactly those prefixes; cheaper since small model writes; cost is plumbing, teacher live. -> W section.

## Go Deeper / Connections

- G1 Best sources: Hinton et al. 2015 (short, readable), DistillSpec (direct source). -> one closing sentence.
- C1 Connections: complete small training run (data generation, scoring pass, training loop, held-out eval, downstream metric that isn't the loss); tiny-LM does the loop at scale; training-memory explains the 16 bytes; LoRA does this fine-tune with a tiny fraction of params; judging by held-out metric matching the goal is "why evals are separate"; serving engines is where you'd deploy EAGLE/Medusa; quantization: 4-bit draft lowers c, making every alpha point worth more. -> one or two sentences near the end.

## Flow

1. Problem: K sweep result, two levers, printed rejections, B's "needs to be smarter", A's impersonator reframe.
2. Predict PR1 (brilliant vs copycat).
3. Origin story: 2006, 2015 dark knowledge, 2022-2024.
4. What a good draft is: recap the rule in one breath, overlap = sum of min, TV, alpha = 1 - TV, easy vs hard tokens, Figure 001.
5. Soft labels: sequence-level distillation, CE/one-hot, the 0.46 vector, KD, KL = CE with soft label, gradient, PR2.
6. Temperature and T squared.
7. Forward vs reverse KL, Pinsker, Figure 002, DistillSpec's no-winner.
8. Whose text: three choices, off-policy, on-policy, exposure bias, DistillSpec.
9. Dataset: pipeline, PR3 disk math, logsumexp and tail, is 64 enough, store vs live FLOPs.
10. Draft shapes: A, B with numbers, shallow and wide, PR4 truncated, Medusa, EAGLE, Medusa-vs-draft comparison (Q5).
11. Offline alpha, teacher forcing, top-1, PR5.
12. Build It t1-t9, compressed setup.
13. Measure expectations.
14. Break It four.
15. Scaling exchange (Q4).
16. Connections sentence, go-deeper sentence.
17. Close: B restates, A sharpens.
