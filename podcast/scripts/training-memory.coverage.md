# Coverage: training-memory

Every outline item -> where it lands in podcast/scripts/training-memory.md (a few quoted words). No MISSING.

| Item | Lands in script |
| --- | --- |
| T1 prereqs re-explained | "remember how we sized a model for serving"; "A gibibyte is two to the thirtieth, about seven percent more"; "Quick refresher ... B F sixteen"; "same hundred twenty-eight gigabytes. One pool" |
| P1 inference recap | "a one billion parameter model in B F sixteen ... about two and a half gigabytes" |
| P2 OOM scene | "Batch of eight, sequence length two thousand forty-eight ... twenty-four gigabyte card ... three point nine one gibibytes" |
| P3 step 2 mystery | "You drop the batch to one, and it runs ... dies on step two"; B "That sounds like a leak" |
| P4 cross-encoder | "Your cross-encoder at work ... Spark or on rented H one hundreds" |
| PR1 predict 1B | "About twenty gigabytes, which is eighteen point four ... two plus two plus four plus eight, sixteen" |
| O1-O4 origin | "Twenty nineteen ... Rajbhandari"; "three gigabytes ... thirty-two gigabyte GPU"; "twenty-four gigabytes of what they called model states"; "DeepSpeed ... F S D P ... writing down the bytes" |
| I1 three phases | "goes back through every step it just took ... nudges every weight" |
| I2-I5 buckets | "First, the weights ... Second, gradients ... Third, optimizer states ... fourth, activations saved for backward" |
| I6 model states | "The first three together have a name, model states" |
| F1 figure 001 | "two horizontal bars drawn to the same scale ... two point three ... four point six ... nine point two ... eleven and a half ... almost ten ... About forty-one" |
| A1 SGD problems | "the gradient from a single batch is noisy ... too big for some of them and too small for others" |
| A2 Adam m and v | "Kingma and Ba, twenty fourteen ... ninety percent of the old ... ninety-nine point nine percent" |
| A3 update | "divides the first by the square root of the second" |
| A4 fp32 states, 8 B | B "they'd be B F sixteen"; A "kept in F P thirty-two ... Four times the B F sixteen weights" |
| A5 lazy states / step 2 | "exp avg and exp avg sq ... exactly twice ... Step two is the first step that starts with m and v" |
| M1 bf16, tensor cores | "same exponent ... seven stored bits ... tensor cores ... halves your activation memory" |
| M2 vanishing update | "about eight thousandths apart ... two tenths of a percent ... four tenths to eight tenths ... Rounds straight back" |
| M3 master weights | "Mixed Precision Training, Micikevicius ... NVIDIA and Baidu ... master copy" |
| S1-S2 16 bytes rule | "Two. Gradients ... two. Master ... four ... Sixteen ... eight B model, a hundred twenty-eight" |
| S3 plain fp32 | "Plain F P thirty-two ... Also sixteen"; B "mixed precision doesn't save any memory?" |
| S4 AMP 16 + 2 | "caches those casts ... Call it sixteen plus two" |
| S5 Megatron 18 | "Megatron ... eighteen" |
| S6 pure bf16, tricks | "Two, two, two, two. Eight ... stochastic rounding ... Kahan summation buffer" |
| S7 inference 2 | "And inference, for comparison, is just the two" |
| F2 figure 002 | "rows of little cells, one cell per byte ... eight-bit Adam gets you to ten ... Adafactor ... about four" |
| PR2 predict 8B Spark | "a hundred twenty-eight point five gigabytes ... a hundred nineteen point seven gibibytes ... LoRA" |
| K1 chain rule | "The chain rule, in plain words ... walk backwards from the loss" |
| K2 linear, GELU, softmax | "A linear layer ... needs the input ... GELU ... softmax ... attention probabilities" |
| K3 saved tensors, no_grad | "micrograd ... save for backward ... saved tensors ... under no grad, nothing gets stashed" |
| F3 figure 003 | "tiny network on a whiteboard ... x zero ... read last" |
| K4 peak at turn, depth | "Every layer's stash is alive at once ... grows with depth" |
| Z1 sbh unit | "one hidden-sized vector for every token in the batch ... one s b h" |
| Z2 Korthikanti counts | "About eleven ... About nineteen ... four. So thirty-four"; "five times the number of heads times s squared times b" |
| Z3 formula, worked | "A hundred sixty. Against thirty-four"; "almost five times" |
| Z4 fused attention | "never store the s by s grid ... tile by tile ... saves more in training than in inference" |
| Z5 Llama per token | "eight thousand one hundred ninety-two ... forty-six for the one B and forty-two for the eight B" |
| Z6 logits | "fifty thousand two hundred fifty-seven ... a hundred twenty-eight thousand two hundred fifty-six ... eight to twelve bytes ... About ten gigabytes ... Liger Kernel" |
| Z7 GPT-2 measurement | "six point three ... three point seven ... two point seven ... half a gigabyte ... five and a half ... fifteen percent higher ... GELU" |
| W1 figure 004 | "Imagine a stacked chart ... You press play ... staircase ... checkpointing toggle" |
| W2-W4 three notices | "the peak is at the turn ... gradients and activations trade places ... sixty-five times its hidden size" |
| W5 first step | "Flip it on and the Adam band at the bottom is just gone" |
| G1 accumulation | "batch eight, four times ... micro-batch ... adds into the gradient ... divide the loss by four"; B "doesn't that change the training?"; "batch norm"; "What you pay is time" |
| G2 checkpointing | "store only each layer's input ... forward one, backward two ... thirty-three percent ... twenty to thirty-five ... use reentrant ... square root of L" |
| G3 8-bit | "block-wise quantization ... two thousand forty-eight values ... two hundred fifty-six values near zero ... eight bytes ... to two ... one-line change" |
| G4 Adafactor | "Shazeer and Stern ... row times its column divided by the total ... eight thousand one hundred ninety-two ... sixteen point eight million ... two tenths of a percent ... T five" |
| G5 precision | "Mixed precision makes the activations two bytes instead of four" |
| G6 sharding | "data parallelism ... eight identical copies"; "Stage one splits the optimizer states ... Stage three ... F S D P" |
| F5 figure 005 | "No sharding, sixteen ... four plus three, seven ... five and a half ... sixteen over N, so four ... none of this touches activations" |
| G7 ZeRO example | "seven and a half billion ... sixty-four GPUs ... a hundred twenty ... thirty-one point four ... sixteen point six ... one point nine" |
| G8 CPU offload | B "push Adam's states over to the CPU side"; A "share the same hundred twenty-eight gigabytes ... ZeRO Infinity ... hundreds of times slower" |
| C1 figure 006 | "a calculator with every lever on it ... seventy-nine point six ... ten gibibytes until you measure it" |
| C2-C5 calculator tries | "eighteen point four, to eleven point five, to nine point two"; "sixteen thousand ... turn off fused attention"; "more than fifty times"; "pure B F sixteen with eight-bit states, or Adafactor" |
| R1-R2 Spark table | "a hundred eighteen ... a hundred eight gibibytes, about a hundred sixteen gigabytes ... seven ... eleven ... nineteen ... twenty-nine billion" |
| R3 bandwidth | "two hundred seventy-three gigabytes a second ... a hundred twelve gigabytes ... four tenths of a second" |
| R4 LoRA | "two skinny matrices ... forty-two million parameters, half a percent ... Seven tenths of a gigabyte" |
| R5 LoRA activations | B "frozen layers don't need any"; A "flow backward through every frozen layer ... checkpointing helps LoRA exactly as much" |
| R6 Spark LoRA, QLoRA | "forty to fifty billion ... QLoRA ... thirty-five to forty gigabytes ... ten-times difference" |
| B0 setup | "GPT two at four sizes ... random weights ... NVIDIA's PyTorch container ... torch A O ... Dropout's off ... training mode" |
| B1 predict.py | "predict before you measure ... thirty-four units per layer ... a hundred twenty-four million four hundred thirty-nine thousand eight hundred eight ... tied" |
| B2 phase measure | "record memory at four moments ... Steps one and two have different peaks ... Synchronize ... fresh process" |
| B3 snapshot | "memory viz page ... flat band ... Adam being born ... logits ... cast cache ... semi-private" |
| B4 saved hooks | "saved tensors hooks ... key by the underlying storage ... sequence squared" |
| B5 one lever | "Change exactly one thing per run ... tokens per second ... time a whole optimizer step" |
| B6 max batch | "binary search ... subprocess ... out-of-memory killer ... free dash h ... agent reviews" |
| B7 done when | "you're done when your predictions are written down ... bigger than twenty percent" |
| E1 steps 3-5 | "Use steps three to five" |
| E2 baseline | "eleven and a half ... one point four ... about twelve ... three point eight"; B "about twenty-nine"; "twenty to forty percent ... dropout" |
| E3 step 2 delta | "Five point eight gibibytes" |
| E4 checkpointing | "about twelve to about one ... roughly eighteen ... twenty to thirty-five ... compute-bound" |
| E5 8-bit | "about four point three gibibytes saved ... Step time roughly the same" |
| E6 accumulation | "about four gibibytes instead of sixteen ... only lever that doesn't change the math" |
| E7 max batch | "fourteen and a half fixed ... roughly fifty ... six tenths ... a hundred seventy ... two or three more" |
| E8 scaling | "double each time ... faster than double ... model states don't change at all with sequence length" |
| X1 eager long seq | "four thousand ninety-six ... about forty-eight gigabytes ... a stash you keep until backward" |
| X2 zero_grad | B "Memory climbs every step"; A "memory doesn't actually grow ... set to none ... two point nine gibibytes" |
| X3 graph alive | "append the loss tensor itself ... item, or detach" |
| X4 pure bf16 | "one in a hundred thousand ... the loss stalls ... model states halve" |
| Q1 16 GB vs 2 | S1-S4 lines plus closing B restatement "sixteen bytes a parameter" |
| Q2 backward + checkpointing | K1-K4, G2; closing "Backward genuinely needs them" |
| Q3 scaling | Z3-Z6, E8 "So at small scale or long context, activations are the bill. For big models at modest context, the model states are" |
| Q4 Spark full vs LoRA, offload | R1-R6, G8 |
| Q5 ZeRO per-GPU | F5 line plus "For those you need checkpointing ... tensor, sequence or pipeline parallelism" |
| D1 go deeper | "section three of the ZeRO paper ... Mixed Precision Training paper" |
| N1 connections | "small language model end to end ... LoRA ... distributed training" |

Numbers checked against the lesson. Derived (not written in the lesson): ZeRO per-GPU bytes on four GPUs (stage 1 seven, stage 2 five and a half, stage 3 four), worked from the lesson's formulas for its four-GPU figure; checkpointing max batch "more than three times" (one hundred seventy over fifty).
