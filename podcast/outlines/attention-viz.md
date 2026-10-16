# Outline: attention-viz (Seeing attention)

## The Problem
1. You built GPT-2, wrote the q-times-k-transpose line, divided by something, masked, loss went down. Question: what is it looking at? -> open on that scene, A asks B.
2. Small things go fuzzy: which axis is the query, does row 7 or column 7 sum to one, why every head stares at the first token, does 0.96 on a token mean "used", does deleting the head change anything. -> A fires these at B, B fumbles one (rows vs columns).
3. output_attentions gives twelve tensors, each one by twelve by T by T; plot one -> pale triangle with bright stripe down left edge. Real but almost useless alone. -> described as a picture over the phone.
4. Goal: viewer you can poke, scores across all 144 heads, an experiment that tests whether it matters. -> A's signpost.

## Origin
5. Pre-Transformer translation squeezed sentence into one fixed vector; long sentences fell apart. -> story.
6. 2014 Bahdanau, Cho, Bengio: decoder looks back at every source word each step, softmax weights. -> story.
7. Paper printed weights as grids: English down one side, French across top, bright cells = alignment; looked like a bilingual dictionary drawn by the model; people enchanted; became default way to ask what a network thinks. -> describe the grid.
8. 2017 Attention Is All You Need: attention is the whole model, many heads per layer. 2019 BertViz (Jesse Vig) put lines on screen for every head. -> quick.
9. 2019 Jain and Wallace "Attention is not Explanation": shuffle/swap weights, same prediction. Field arguing since. -> B reacts.
10. Modern answer: Anthropic circuits work (Elhage 2021, Olsson 2022): attention is one readable part of a mechanism you then test by cutting. -> A.

## Idea: lookup with soft edges
11. Library analogy: question vs spine labels, take a little of each, more from best match. -> short, exact comparison.
12. Attention head term: one independent computation; GPT-2 small 12 per layer x 12 layers = 144 heads, each with own Q K V weights. -> inline.
13. Query = question, key = label on spine, value = content handed over. Each token plays all three. -> A.
14. Q, K, V = token's current vector times three learned matrices. -> A.
15. Residual stream term: running vector per token every layer reads and adds to; layer 5 sees words plus everything layers 0-4 wrote. By layer 5 " river" can carry "I came right after lamp" and its key can advertise it. -> B voices wrong model (tokens are words), A corrects.

## Idea: the shapes
16. Width 768, 12 heads, 768/12 = 64 per head = d_head; heads carved out of width, not added on top. -> B guesses heads add width; A corrects.
17. Shape walk: X = LayerNorm of residual, T by 768; times W_Q, W_K, W_V -> Q K V each split into 12 heads of T by 64; scores = Q K-transpose over root 64 -> T by T; mask above diagonal; softmax along rows -> A (the thing you plot); Z = A V -> T by 64; concat 12 heads, times W_O -> T by 768; added to residual. -> spoken as a pipe, no symbols.
18. Habit one: rows are queries, columns are keys. A[i,j] = how much i reads from j. Lower-triangular: row 0 has one nonzero, row 10 has eleven. -> spatial description.
19. Habit two: rows sum to one, columns don't. Row = probability distribution over the past. Column = how popular this token is as a source, sums anywhere 0 to T. -> B gets this wrong in Problem; A resolves here. (Diagnostic: "distribution" said precisely.)

## Idea: one row, five steps (interactive bar figure)
20. Toy: query "sat" in "<eot> The cat sat on the"; numbers are a toy but arithmetic is real. -> describe bars per key.
21. Step 1 dot products: one number per key incl. future keys, because training computes whole T by T grid in one matmul. Toy raw scores 26, 6, 30, 14, 38, 9. -> A reads a few, notes "on" is biggest but it's future.
22. Step 2 scale by root 64 = 8. Why: 64 independent terms variance 1 -> variance 64 -> typical size about 8; dividing brings back to about 1 whatever d_head. -> worked in words.
23. Predict no-scale: scores 8x bigger, ranking unchanged; weights sharper, like temperature one-eighth; toy cat 0.56 -> 0.98; real model at init near one-hot; gradient for other keys near zero (saturated softmax term); learns slowly about keys it isn't staring at; Vaswani gives this reasoning. -> A asks, B guesses, reveal.
24. Step 3 mask: predicting token i+1 must not see i+1 or later; set j > i to minus infinity; causal mask term; masked_fill; HF uses most negative float instead, same zeros. -> A.
25. Step 4 softmax: exponentiate, divide by sum; all positive, sum to one, e to minus infinity is zero. Row must add to one even if nothing useful -> explains brightest stripe. -> plant.
26. Step 5 mix: output = weighted sum of values; cat 0.56 -> 56% of output is cat's value. 12 heads glued (12 x 64 = 768), times W_O, added back to residual. Toy: mostly cat's value plus end-of-text's. -> A.
27. 12 heads x 12 layers, each full T by T; 15 tokens -> 144 little triangles; need a way to look. -> signpost.

## Idea: what real heads do (interactive viewer)
28. Four real GPT-2 small heads on the same 15 tokens: endoftext + 7 arbitrary words (lamp river seven quiet orange window pencil) + same 7 again. Ran through HF transformers, rounded to two decimals, nothing else processed. -> "when I ran this".
29. Viewer description: keys in a column on left, queries on right, lines with opacity = weight; hover query -> what it reads; hover key -> who reads it; heatmap toggle. -> described.
30. L4 H11 previous-token head: each query sends almost all weight one step back; on longer random seq 0.99 on previous token; job = bookkeeping, copies "token before me was X" into residual for later layers. -> heatmap: a stripe just under the diagonal.
31. L0 H1 same-token head: first half each token reads itself; second half second "river" splits ~50/50 between itself and first river. Matches on identity. -> diagonal plus a second parallel stripe seven back.
32. L5 H7 sink head: ~0.9 of every row on position 0 regardless of query; nothing to do, softmax insists on spending 1.0. -> left-edge column.
33. L5 H5 induction head: first half parks on position 0; second half second "lamp" (pos 8) reads "river" (pos 2) with 0.96; not lamp but token after earlier lamp; second river reads seven. -> stripe offset.
34. Predict why-next: sequences repeat, so what came after lamp before is best guess now; that is next-token prediction. Layer 0 can't: river's key must advertise "token before me was lamp"; at layer 0 position 2 only knows it is river at pos 2; earlier previous-token head must write it first; 5.5 needs 4.11 (or another). -> B guesses, A reveals.

## Idea: induction heads, two-head circuit
35. Induction head term: at token A, attends to token right after earlier A and copies it: "A B ... A -> B". Circuit term: small set of components that together implement one behaviour, found by tracing outputs. -> inline.
36. Circuit figure: step 1 earlier layer each token reads predecessor; lamp at 1, river at 2; prev-token head writes "after lamp" into river's key. Step 2 later layer: lamp at 8 queries "who came after lamp?", finds river, copies river's value forward -> predicts river. -> described left to right.
37. K-composition term: one head's output changes the keys a later head sees. Also Q-composition and V-composition; from Elhage "Mathematical Framework". -> A.
38. Can't see composition in any single plot: you see a diagonal-ish stripe in layer 4 and an off-by-one stripe in layer 5; must know to connect them. -> A.
39. Olsson 2022: induction heads big part of in-context learning (term: better at later tokens using earlier ones, no weight updates). Form abruptly early in training, "phase change" visible as bump in loss curve, same moment model gets better at long contexts. Some do fuzzy/translated copies, match on meaning. -> A.

## Idea: why random tokens
40. Need a test where only induction helps; natural text bad ("York" after "New" might be English knowledge). 50 random ids, repeated; first half pure noise, second predictable only by looking back. -> B's natural-text instinct, A corrects.
41. Predict loss-halves: uniform guess = ln 50,257 ≈ 10.8 nats; first half ~12 nats, worse than uniform because model confidently predicts English; second half ~0.2 nats -> ~0.8 probability on right token; 124M model goes to near-perfect recall when sequence repeats = induction circuit. -> explain nats briefly; B guesses.
42. Scores: repeat length T; in second half, position i holds same token as i - T, token after earlier copy at i - T + 1. Previous-token score = average A[i, i-1]; induction score = average A[i, i-T+1] over second-half positions. -> worked example with 50.
43. Uniform head would score ~1/i, ~0.01-0.02 here; real ones above 0.8; compute for all 144 and right ones stand out like lit windows. -> A.

## Idea: the sink
44. Over 101-token random seq, average head put 0.42 on position 0; some > 0.9. Is it important? Mostly not. -> B says "must be important".
45. Head with nothing to read still spends 1.0; cheapest "nothing" = token with small/harmless value, consistently; position 0 is the one every query sees -> parking spot. -> A.
46. Xiao et al. 2023 named attention sink; found it hard way: sliding window evicts first token's K and V from KV cache, quality collapses though token is meaningless; keep first four tokens' KV restores it -> StreamingLLM. Re-explain KV cache briefly. -> story.
47. Sink table: L5 H7 weight 0.92, value norm at pos 0 0.95, elsewhere 4.83, share of weight-times-norm 0.70; L5 H5 0.51 / 2.25 / 6.15 / 0.28; L4 H11 0.07 / 0.66 / 4.33 / 0.01. -> not read as table: lead with sink head numbers, mention induction head briefly.
48. Value norm term: length of value vector; high weight but short vector -> little contribution. Sink value about five times smaller; 92% of attention becomes a smaller share (70%). -> A.
49. Caveat: weight-times-norm is rough proxy (Kobayashi 2020); real contribution goes through W_O and depends on direction. Heatmap lied by omission: shows weights, only half the product. -> A.

## Idea: what a bright line does and doesn't tell you
50. Weights are not contributions: output = sum weight times value; then W_O, then added to residual that already holds a lot; head's whole output can be small next to the stream. -> A.
51. Weights are not the cause: Jain and Wallace 2019, different attention distributions same prediction, attention disagreed with gradient importance; Wiegreffe and Pinter "Attention is not not Explanation": swapping after training isn't fair, attention can be informative if tested; both agree: weight is a hypothesis, not a finding. -> B amused at title.
52. Tokens aren't words at deeper layers: layer 8 position 5 carries info from 0-4; "head 8.4 looks at orange" means looks at whatever's in position 5's stream now; attention rollout (Abnar and Zuidema 2020) chains matrices across layers, rough. -> A.
53. One head is not one behaviour: prev-token on one input, sink on another; 5.5 is induction only when there's a repeat. -> callback.
54. Heads back each other up. -> setup for ablation.
55. Ablation term: delete/neutralise a component, measure how much worse. Zero-ablation sets output to zero; mean-ablation term replaces with average output over many inputs, less likely to push model off-distribution. Either is causal; plot is not. -> A.
56. Predict ablate: top five induction heads 5.5, 6.9, 5.1, 7.10, 7.2; second-half loss ~0.21; ablate 5.5 -> 0.26; 5.5 + 6.9 -> 0.33; all five -> 4.52 (over 20x worse, still far below 12 so more machinery); five random non-induction -> 0.19 to 0.66 across three draws. Redundancy; mirror of not-explanation: picture can look important and not be (sinks), head can be important and not look it alone (redundancy). Wang 2022 IOI circuit "backup heads". -> B guesses big jump for one head; A reveals.

## Build It
57. Three files in one folder: export script, scoring/ablation script, web page. Use HF GPT-2 to trust weights; if own GPT-2 loads same weights, Task 2 doubles as a test. -> one line.
58. T0 setup: venv, torch + transformers; load GPT-2 with eager attention; prepend BOS; check 12 tensors of (1, 12, T, T), rows sum to one, nothing above diagonal. -> said.
59. Eager matters: default is fused kernel (scaled dot product attention, same idea as FlashAttention) that never builds T by T; on 5.x asking for attentions without eager silently returned empty tuple; older 4.x falls back with warning. -> A.
60. Tokenizer doesn't add endoftext at start; add it so position 0 is same token every experiment. -> A.
61. T1 recompute head 5.5 by hand: hidden_states[l] is residual entering layer l (index 0 = embeddings); attention reads after ln_1; c_attn is Conv1D, weight stored in-by-out 768 by 2304, so h times W plus b, not W transpose; wrong version fails loudly on shape; same transpose on square c_proj 768 by 768 runs fine and is quietly wrong, classic bug loading OpenAI weights. 2304 splits q|k|v, each 768 = 12 heads x 64, head-major. -> B surprised by quiet bug.
62. Done when: max difference ~1e-6 (got 1.5e-6, float32 rounding); can say which axis is query, what hidden_states[5] is, why mask above diagonal. -> said.
63. T2 export JSON: tokens, n_layers, n_heads, attn[l][h][i] row i storing only first i+1 entries, round 3 decimals, keep leading spaces shown as dot. -> A.
64. Size math: per head T(T+1)/2 numbers, 144 heads, ~5-6 chars each; work for T = 15, 64, 1024. -> worked aloud (numbers gap).
65. T3 viewer: one html, one js, no libraries; serve with python http.server (can't fetch from file://); layer/head selects; lines view keys left queries right line opacity = weight, skip under ~0.02 or fog; hover query shows row, hover key shows column, print top weights; heatmap toggle with masked cells drawn differently from zero cells; 12 by 12 all-heads overview, click to select; diagonals and left-edge stripes jump out. -> described as what you'd see.
66. Stroke-opacity hyphenated attribute names; phone width, 360 px fits ~20 tokens, scroll vertically for longer. -> brief.
67. Agent review for classic bugs: transposed axes (hover query 8 shows row 8?), off-by-one labels, overview redrawing 144 x T-squared elements on every hover. -> A.
68. T4 scores: seed 0, 4 sequences of 50 random ids from 1000-9999 (skip rarest), eot + rand + rand = 101 tokens; stack to (12, 4, 12, 101, 101); prev-token score mean A[i,i-1] over i >= 2; induction mean A[i,i-T+1] over second-half queries, work out range (eot shifts by one); sink mean A[i,0] over i >= 1; loss per half; fancy indexing not loops; print top 6, export 12x12 grids to color overview. -> A.
69. Done when: prev-token > 0.9, at least four induction > 0.8, findable in viewer, second-half loss < 0.5, first half > 10. -> A.
70. T5 ablation: hook just before c_proj (W_O); input is 12 heads' outputs side by side, 64 cols each; zero head h's 64 columns. Forward pre-hook. Measure: none, top induction, top 2, top 5, top prev-token, three sets of 5 random; mean-ablation version using natural text averages; composition check: ablate prev-token heads, recompute 5.5 induction score. -> A.
71. T6 on Spark: gpt2-medium (24 layers, 16 heads) or ~0.5B Qwen with RoPE; eager; attention memory grows layers x heads x T squared; do induction heads appear, at what fraction of depth; does sink stay at 0 with no BOS; agent checks indexing when head count changes. -> A, B ties to Spark.

## Measure
72. Setup: GPT-2 small, Apple silicon Mac CPU, seed 0, ids 1000-9999, T = 50; exact numbers vary, head identities and shape shouldn't. -> one line.
73. Top prev-token L4 H11 0.99; next L3 H7 0.52, L6 H8 0.50, L2 H2 0.49. -> said.
74. Top induction L5 H5 0.94, L6 H9 0.93, L5 H1 0.92, L7 H10 0.92, L7 H2 0.86. -> said.
75. Top sink L5 H7 0.91, L8 H4 0.90, L7 H9 0.86; average all heads 0.42. -> said.
76. Loss first/second 12.2 / 0.20 (4 seqs). -> said.
77. Ablation table: none 0.21; 5.5 0.26; 5.5+6.9 0.33; top 5 4.52; L4 H11 0.23; random 0.19, 0.33, 0.66; induction score of 5.5 after ablating 4.11: 0.94 -> 0.82; after top 4 prev-token heads: 0.94 -> 0.63. -> said in prose.
78. Notice: scores bimodal, most near zero, few near one; why scores beat eyeballing. -> A.
79. Notice: induction heads in middle layers 5-7, after prev-token head at 4; order forced by circuit. -> A.
80. Notice: ablation far from linear: one head +0.05, five +4.3. -> B.
81. Notice: top prev-token head not alone; killing 4.11 barely touches loss, dents 5.5 0.94 -> 0.82; four heads -> 0.63; weaker prev-token heads in layers 2-6 carry same info. -> A.
82. Notice: zero-ablation blunt: top 5 zeroed, first-half loss rose 12.0 -> 14.7 on tokens no induction head could help; pushed residual off-distribution; compare with mean-ablation; gap measures how off-distribution. -> B spots contradiction.

## Break It
83. Default attention implementation: attentions empty tuple, no error, IndexError three lines later; fused kernels never build the matrix; attention matrix is a debugging artifact, production never holds it. -> what-if.
84. Forget BOS: lamp becomes position 0 and the sink; head 5.7 put 0.93 on lamp; naive reading "model finds lamp fascinating"; same model same words different story. -> what-if.
85. Score induction on natural text: first-half loss drops to normal English (2.9 nats on a 30-token sentence); low second-half loss mixes recall and language knowledge; head attending to next token might be grammar; clean separation gone; random tokens are the control. -> what-if.
86. Transpose in viewer: prev-token head appears to look forward; sink appears as position 0 reading everything, impossible under causal mask; if a token attends to the future, axes are flipped; upper triangle must be empty = free correctness check. -> what-if.

## Explain It Back (substance, no quiz)
87. EIB1: full walk with shapes (768, LayerNorm, three matrices, 64 per head, dot with earlier keys, divide by 8, mask, softmax, weighted sum 64, concat to 768, W_O, add to residual; T by T lower triangular, rows queries sum to one, columns keys). -> lands in shapes section + recap in ending.
88. EIB2: induction head definition, dependence on prev-token head via K-composition; find via BOS + random seq repeated, average attention from i to i - T + 1; induction near 1, others near 1/i; confirm by ablation vs random. -> covered.
89. EIB3: first-token attention does not mean it matters; parking; value small (5.7 about a fifth); still functionally important as parking spot -> StreamingLLM keeps four; high weight = nothing to do. -> covered.
90. EIB4: weights as hypothesis not conclusion; weight times value through W_O into residual; deep tokens are mixtures; Jain-Wallace / Wiegreffe-Pinter; causal test ablate or patch; one-head ablation understates due to backup: zero one barely moves, five makes 20x worse. -> covered + ending.
91. EIB5: scaling to 32 layers, 32 heads, 4096 tokens: layers x heads x T squared / 2; GPT-2 small at T=64 = 144 x 2080 ≈ 300k numbers ≈ 1.5 MB JSON; big model ≈ 8.6 billion numbers ≈ 34 GB float32, more as JSON; eager materialises every T by T; fix: compute on demand per selected head on a server, send top-k per row, quantise to 8 bits, canvas not SVG past hundreds of tokens (8 million SVG elements kills browser), overview from precomputed summary scores (prev-token, induction, sink, entropy) not thumbnails. -> B asks the Spark/production question; A works it.

## Go Deeper / Connections
92. Best reads: Elhage et al. "A Mathematical Framework for Transformer Circuits"; Olsson et al. "In-context Learning and Induction Heads". (Others: Xiao sinks, Jain/Wallace + Wiegreffe/Pinter pair, Clark BERT, Kobayashi, Wang IOI, TransformerLens, BertViz.) -> one sentence naming Framework paper; TransformerLens/BertViz mention.
93. Connections: KV cache = same Q K V from serving side; cached keys/values are what each new query reads; sink is why sliding-window caches keep first tokens. FlashAttention never writes T by T, why output_attentions needs slow path. Next: activation patching — copy a head's output from a run on a different input; "matters" -> "carries this information". -> short.

## Flow
Problem (cold open on the question, B fumbles rows/columns) -> Origin story (grids) -> library/QKV/residual -> shapes pipe, two habits -> five-step toy row + no-scale Predict -> four real heads described one by one (prev-token, same-token, sink, induction) -> why-next Predict -> circuit + K-composition + in-context learning -> random tokens + loss Predict + scores -> sink + StreamingLLM + value norms -> caveats list as conversation -> ablation Predict -> Build It walk (eager trap, Conv1D bug, JSON size math, viewer, scores, hooks, Spark) -> Measure numbers + noticings -> Break It four what-ifs -> scaling question (EIB5) -> Connections/Go Deeper sentence -> ending: B restates, A sharpens.
