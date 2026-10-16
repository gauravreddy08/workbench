# Coverage: attention-viz

| # | Outline item | Where in script |
|---|---|---|
| 1 | Built GPT-2, what is it looking at | Problem: "what is it actually looking at?" |
| 2 | Fuzzy questions (axis, row/col sum, first token, 0.96, delete head) | Problem: B "Queries are... columns?"; A lists the rest |
| 3 | twelve tensors, T by T, pale triangle, left stripe | Problem: "a pale triangle... one bright stripe" |
| 4 | Goal: viewer, scores across 144, experiment | Problem: "A viewer you can actually poke at" |
| 5 | Fixed-vector translation, long sentences fail | Origin: "squeezed it into one fixed-size vector" |
| 6 | Bahdanau, Cho, Bengio 2014 | Origin: "in twenty fourteen, Dzmitry Bahdanau" |
| 7 | Alignment grids, dictionary, enchanted | Origin: "a bilingual dictionary drawn by the model" |
| 8 | Vaswani 2017, BertViz 2019 | Origin: "Attention Is All You Need... BertViz" |
| 9 | Jain and Wallace | Origin: "Attention is not Explanation" |
| 10 | Circuits work, test by cutting | Origin: "test the mechanism by cutting it" |
| 11 | Library analogy | Lookup: "label on its spine" |
| 12 | Head term, 144 heads | Lookup: "a hundred and forty-four heads" |
| 13 | Query/key/value roles | Lookup: "Its query is the question it brings" |
| 14 | Three learned matrices | Lookup: "multiplied by three learned matrices" |
| 15 | Residual stream, river carries "after lamp" | Lookup: B wrong model "embedding of the word"; A "I came right after the word lamp" |
| 16 | 768/12 = 64, carved not added | Shapes: B "its own seven sixty-eight?" |
| 17 | Full shape pipe | Shapes: "follow one layer like a pipe" |
| 18 | Rows queries, lower triangular, row 0 one, row 10 eleven | Shapes: "Row ten... has eleven" |
| 19 | Rows sum to one, distribution; columns 0..T | Shapes: "A row is a probability distribution over the past" |
| 20 | Toy query sat | Five steps: "Our query is 'sat', position three" |
| 21 | Dot products incl. future, why | Five steps: B "'on' is the biggest"; "whole T by T grid in one matrix multiply" |
| 22 | Scale by 8, variance argument | Five steps: "a sum of sixty-four products... typical size around eight" |
| 23 | Predict no-scale: 0.56 to 0.98, saturation, Vaswani | Five steps: "temperature of one-eighth... saturated softmax" |
| 24 | Causal mask, masked fill, most negative float | Five steps: "That's the causal mask" |
| 25 | Softmax forces sum to one | Five steps: "The row has to add up to one even if nothing in the past is useful" |
| 26 | Mix, 56 percent, concat, W O, residual | Five steps: "fifty-six percent of the output is cat's value vector" |
| 27 | 144 triangles for 15 tokens | Five steps: "a hundred and forty-four little triangles" |
| 28 | Four real heads, 15-token input, HF, two decimals | Real heads: "lamp, river, seven, quiet..." |
| 29 | Viewer: lines, hover, heatmap toggle | Real heads: "Keys in a column down the left" |
| 30 | L4 H11 previous-token, 0.99, bookkeeping | Real heads: "four eleven... Bookkeeping" |
| 31 | L0 H1 same-token, 50/50 | Real heads: "splits about fifty-fifty" |
| 32 | L5 H7 sink 0.9 | Real heads: "About point nine of every row lands on position zero" |
| 33 | L5 H5 induction, 8 reads 2 at 0.96 | Real heads: "position eight, reads 'river', position two" |
| 34 | Predict why-next + layer-0 answer | Real heads: B "predicting by copying"; A "five five needs four eleven" |
| 35 | Induction head + circuit terms | Circuit: "A, B, then later A, so predict B" |
| 36 | Circuit figure described | Circuit: "draw it in your head left to right" |
| 37 | K-composition, Q and V composition, Elhage | Circuit: "That's called K-composition" |
| 38 | Can't see composition in one plot | Circuit: "you have to know to connect them" |
| 39 | Olsson: ICL, phase change, fuzzy copies | Circuit: "in-context learning... phase change... translated ones" |
| 40 | Why random; New York | Random: B "use a real paragraph"; "York after New" |
| 41 | Predict loss halves: 10.8, 12, 0.2, 0.8, 124M | Random: "about ten point eight... around twelve... point two nats" |
| 42 | Score definitions | Random: "the one forty-nine back" |
| 43 | Uniform about 1/i, real above 0.8, lit windows | Random: "one or two hundredths... lit windows" |
| 44 | 0.42 average on pos 0; B thinks important | Sink: B "a summary token" |
| 45 | Parking spot reasoning | Sink: "use it as a parking spot" |
| 46 | Xiao 2023, StreamingLLM, first four | Sink: "Keeping just the first four tokens' keys and values" |
| 47 | Value-norm table | Sink: five seven 0.92/0.95/4.8/70; five five half/28; four eleven 1 percent |
| 48 | Value norm term, five times smaller | Sink: "about five times shorter" |
| 49 | Kobayashi proxy, W O and direction, lied by omission | Sink: "The heatmap lied by omission" |
| 50 | Weights not contributions | Caveats: "One. Weights aren't contributions" |
| 51 | Weights not cause; Wiegreffe and Pinter; hypothesis | Caveats: "Attention is not not Explanation" |
| 52 | Tokens not words deep; rollout | Caveats: "attention rollout, from Abnar and Zuidema" |
| 53 | One head not one behaviour | Caveats: "Four. One head isn't one behaviour" |
| 54 | Heads back each other up | Caveats: "And five, heads back each other up" |
| 55 | Ablation, zero vs mean | Caveats: "That's an ablation... Mean-ablation" |
| 56 | Predict ablate: 0.26, 0.33, 4.52, 0.19-0.66, backup heads, Wang | Caveats: "Just five five: point two six" ... "backup heads" |
| 57 | Three files; own GPT-2 as test | Build setup: "Three files in one folder" |
| 58 | Setup checks | Build setup: "Every row sums to one. And nothing above the diagonal" |
| 59 | Eager vs fused, empty tuple on 5.x, warning on 4.x | Build setup: "silently returned an empty tuple" |
| 60 | Add end-of-text yourself | Build setup: "Add it yourself, on purpose" |
| 61 | Recompute: hidden_states index, ln_1, Conv1D, square c_proj quiet bug, split layout | Recompute: "Conv one D... quietly wrong numbers" |
| 62 | Done when 1.5e-6, can say axes | Recompute: "about one and a half millionths" |
| 63 | JSON export format | Export: "row i only needs its first i plus one entries" |
| 64 | Size math T=15, 64, 1024 | Export: "about one and a half megabytes... four hundred megabytes" |
| 65 | Viewer features, fog, masked vs zero, overview | Viewer: "turns to fog"; "allowed, and chose not to"; "twelve by twelve grid" |
| 66 | Hyphenated attributes, phone width | Viewer: "spelled with hyphens"; "three hundred sixty pixels" |
| 67 | Agent review bugs | Viewer: "does hovering query eight actually show row eight?" |
| 68 | Scoring setup, scores, index range, fancy indexing, export grids | Scoring: "fifty-one through a hundred to the position forty-nine back" |
| 69 | Done-when thresholds | Scoring: "a previous-token head scores above point nine" |
| 70 | Ablation hook, runs, mean-ablation, composition check | Ablation: "forward pre-hook"; "recompute five five's induction score" |
| 71 | Spark: GPT-2 medium / Qwen, memory, depth fraction, no BOS, indexing | Ablation: "GPT two medium, which has twenty-four layers" |
| 72 | Measure setup | Measure: "Apple silicon Mac CPU, seed zero" |
| 73 | Previous-token scores | Measure: "three seven at point five two" |
| 74 | Induction scores | Measure: "five five at point nine four, six nine..." |
| 75 | Sink scores, 0.42 | Measure: "five seven at point nine one" |
| 76 | Loss 12.2 / 0.20 | Measure: "twelve point two, second half point two" |
| 77 | Ablation table incl. 0.23, 0.82, 0.63 | Measure + Caveats predict |
| 78 | Bimodal scores | Measure: "The scores split into two clumps" |
| 79 | Layer order forced | Measure: "that order's forced by the circuit" |
| 80 | Nonlinear ablation | Measure: "One head adds about point oh five... five heads... four point three" |
| 81 | Prev-token redundancy | Measure: B objection; "Weaker previous-token heads in layers two through six" |
| 82 | Zero-ablation blunt, 12.0 to 14.7 | Measure: "From twelve to fourteen point seven" |
| 83 | Break: default implementation | Break It: "you get an empty tuple back" |
| 84 | Break: forget BOS, 0.93 on lamp | Break It: "head five seven put point nine three on lamp" |
| 85 | Break: natural text, 2.9 nats | Break It: "about two point nine nats" |
| 86 | Break: transpose, upper triangle check | Break It: "The upper triangle must be empty" |
| 87 | EIB1 full walk | Shapes pipe + five steps; restated in Close |
| 88 | EIB2 induction + how to find + confirm | Circuit, Random, Caveats predict |
| 89 | EIB3 sink | Sink section ("about five times shorter"; StreamingLLM) + Close |
| 90 | EIB4 weights as hypothesis | Caveats + Close "A bright line is a clue about where to cut" |
| 91 | EIB5 scaling 32x32x4096 | Scaling: "about eight point six billion numbers... thirty-four gigabytes" |
| 92 | Go Deeper | Connections: "Mathematical Framework... TransformerLens... BertViz" |
| 93 | Connections: KV cache, FlashAttention, activation patching | Connections section |

MISSING: none.

Numbers checked against the lesson. Derived (not written in the lesson): toy end-of-text weight about a third (0.34); head size 256 -> divide by 16 (illustration); same-token stripe seven back and induction stripe six back (from viewer data); JSON size ~17k numbers / ~100 KB at T=15 and ~75M numbers / ~400 MB at T=1024; induction query range 51-100, offset 49.
