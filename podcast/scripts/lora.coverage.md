# Coverage: lora

Every outline item -> where it lands in podcast/scripts/lora.md (a few quoted words). No MISSING.

| Item | Lands in script |
| --- | --- |
| T1 prereqs re-explained | "Remember the training-memory lesson"; "From the quantization lesson: four bits gives you sixteen possible levels"; "from the virtual memory lesson"; "same trick V L L M plays with the KV cache"; "your own naive server from the baseline lesson" |
| P1 cross-encoder, strict JSON | "a little JSON object with a label, zero to three, and a one-sentence reason" |
| P2 prompting failures | "about one time in twenty ... Sure! Here's my assessment ... label four on a zero-to-three scale ... three in the morning" |
| P3 fine-tuning term | "You take a model that's already been trained ... train it a bit more" |
| P4 128 GB bill | B "sixteen gigabytes ... eight times the room"; A "sixteen bytes ... a hundred twenty-eight gigabytes ... shared with the operating system" |
| P5 copies per task | "three copies, forty-eight gigabytes of disk" |
| P6 tiny change | "could often be written down with a few million" |
| O1 GPT-3 wall | "three hundred fifty gigabytes in sixteen-bit. A fine-tuned copy per customer is absurd" |
| O2 adapters | "Houlsby and colleagues in twenty nineteen ... add latency every time" |
| O3 prefix tuning | "Li and Liang, twenty twenty-one ... eat into your context window ... finicky" |
| O4 LoRA results | "Edward Hu ... ten thousand times ... about three times ... about thirty-five megabytes" |
| O5 why it won | "multiplied out and added straight back ... costs nothing extra" |
| I1 linear layers | "query, key, value and output projections ... gate, up and down" |
| I2 W + delta W, 16.8M | "sixteen point eight million numbers. For one matrix, in one layer" |
| I3 16-byte bill | "Two plus two plus four plus four plus four. Sixteen"; "implementations differ a little" |
| I4 Adam, mixed precision terms | "Adam is the standard optimizer ... two running averages"; "mixed precision means ..." |
| I5 activations | "intermediate outputs of every layer ... grow with batch size times sequence length" |
| I6 frozen weight cost | "needs no gradient. No master copy. No optimizer state ... half a byte" |
| F1 figure 001 | "horizontal bars ... sixteen, sixteen, thirty-two, sixty-four ... point seven of a gigabyte ... five point seven ... about twenty gigabytes" |
| I7 5.7 GB estimate | B "Where does five point seven come from?"; "three point six ... about a gigabyte each" |
| I8 B times A, bottleneck, rank terms | "squeezes them down to just r numbers ... sixteen independent directions"; "rank of a matrix means" |
| I9 counts table | "about a hundred thirty-one thousand ... point seven eight percent ... sixty-five thousand, point three nine ... half a million, still only three percent" |
| I10 non-square, 41.9M, 6.8M | "fourteen thousand three hundred thirty-six ... forty-one million, nine hundred forty-three thousand and forty ... six point eight million" |
| I11 the bet | "the update fine-tuning actually needs is close to low-rank" |
| F2 figure 002 setup | "twenty-four by twenty-four ... truncated S V D. So it's a ceiling"; three update types |
| F2a shapes | "a third of d squared ... point two percent" |
| F2b error curve | "falls off a cliff at exactly the right rank ... slow slope" |
| F2c spectrum, Eckart-Young | "singular values ... Eckart-Young theorem ... Everything grey is just gone" |
| PR1 predict rank-enough | A asks; B guesses; "rank one to rank eight ... amplifying features"; "ten to a hundred times higher ... ninety percent" |
| I12 intrinsic dimension method | "Aghajanyan, Luke Zettlemoyer and Sonal Gupta ... random projection ... Li and colleagues in twenty eighteen" |
| I13 200 numbers, bigger smaller | "about two hundred numbers ... bigger, better-pretrained models had smaller intrinsic dimension" |
| I14 structured projection | "Instead of a random projection, it uses a structured one" |
| F3 figure 003 | "Picture it as two lanes ... funnel narrowing ... meet at a plus sign" |
| I15 B zero, A random, gradients | B "Why zero, though?"; "gradient for B is proportional to A times x ... Kaiming uniform"; B "A gets nothing, because B is zero" |
| I16 alpha/r, rsLoRA | "alpha over r ... rank-stabilised LoRA, Kalajdzievski ... square root of r ... alpha equals two r" |
| I17 LoRA dropout | "LoRA dropout ... five to ten percent" |
| PR2 predict step time | B "ten times?"; "About two thirds ... six floating-point operations ... layer thirty-two ... four ... instead of six"; QLoRA slower |
| I18 q and v default | B "Every tutorial I've seen does query and value" |
| I19 all linear, MLP matters | "QLoRA paper found ... LoRA Without Regret ... Attention-only LoRA underperformed" |
| I20 practical default, PEFT | "PEFT, which is Hugging Face's library ... all linear ... rank sixteen" |
| I21 merge | "merged W is W plus alpha over r times B times A ... merge and unload ... Subtract the same product" |
| I22 QLoRA merge trap | B "merge into the four-bit weights"; "load the base in B F sixteen ... run your eval on the merged model" |
| PR3 adapter size | B "eighty-four megabytes? ... sixteen gigs"; "eight point oh three billion ... two hundred times gap" |
| I23 serve many | "one copy of the base and hundreds of adapters, and pick an adapter per request" |
| F4 figure 004 | "Picture the two choices side by side ... Judge, extract, judge again ... adapter pool" |
| I24 Punica, S-LoRA, vLLM | "Punica, from Chen ... S-LoRA, from Sheng ... enable LoRA and LoRA modules ... cost a little speed" |
| I25 QLoRA intro | "a hundred thirty gigabytes for a sixty-five B ... Dettmers ... single forty-eight gigabyte GPU" |
| I26 NF4 | "quantiles of a bell curve ... block of sixty-four ... gradients flow through ... never update them" |
| I27 double quantization | "half a bit per weight ... four gigabytes ... blocks of two hundred fifty-six ... point one two seven ... point three seven ... three gigabytes" |
| I28 paged optimizers | "NVIDIA's unified memory ... swapping pages out to disk ... the Spark" |
| I29 dequant cost | B "So QLoRA's faster too"; "Slower, actually ... until you try a seventy B" |
| I30 Biderman setup | B "fine-tune it on all our internal docs"; "Columbia and Databricks ... continued pretraining ... instruction fine-tuning" |
| I31 learns less | "most of all in continued pretraining on code ... ten to a hundred times" |
| I32 forgets less | "HellaSwag, ARC and WinoGrande" |
| I33 their advice | "target all modules, use a higher learning rate ... adapting behaviour, not absorbing a corpus" |
| I34 boundary, retrieval, Without Regret | "internal APIs, or a new language ... retrieval ... more information than the adapter had room for" |
| I35 catastrophic forgetting | "McCloskey and Cohen ... nineteen eighty-nine ... Lower rank, fewer steps ... two halves" |
| I36 chat template | "start-header marker, the word user ... apply chat template" |
| I37 loss mask | B "More tokens in the loss is more signal"; "ninety-seven percent ... minus one hundred ... ignore index ... end-of-turn token ... stays in the loss" |
| F5 figure 005 | "Picture one example as two rows ... Five hundred masked, fifteen trained" |
| I38 tokenizer boundary | "Tokenizers can merge characters across the boundary" |
| I39 TRL | "T R L library, its S F T trainer ... Do it by hand once anyway" |
| I40 hyperparameters | "one e minus four, two e minus four ... ten times smaller ... Rank: sixteen ... one to three passes ... short warmup, then a cosine" |
| I41 overfitting signs | "training loss keeps dropping while held-out loss turns back up ... point oh one ... word for word ... capital of France ... label zero" |
| I42 eval half one | B "if the loss goes down"; "held-out set ... macro-F one ... ninety-five ... ninety-six ... split by query" |
| I43 eval half two | "L M evaluation harness ... thirty to fifty everyday prompts ... looking for drops" |
| I44 eval what you serve | "The merged one, through your server" |
| B0 two halves | "On your Mac, you build LoRA yourself ... On the Spark" |
| B1 t0 SmolLM2 | "Small L M two ... a hundred thirty-four and a half million ... a hundred ninety-two ... Conv one D" |
| B2 t1 LoRALinear | "makes A ... Kaiming-uniform ... B ... all zeros ... x times A first ... Collect the list ... freeze everything in the model first" |
| B3 t2 four checks | "four checks ... times thirty layers ... One of them is exactly zero ... logits ... one in a hundred thousand" |
| B4 t3 toy | "Ana, Chen, Femi ... encode ... collate ... exact-match ... up to forty new tokens ... two hundred fifty steps ... M P S ... fifty held-out" |
| B5 t4 Spark setup | "same NVIDIA PyTorch container ... bitsandbytes ... ARM CPU and the G B ten GPU ... playbooks ... Don't let pip quietly replace" |
| B6 t5 real task + eval | "about four hundred tokens ... MS MARCO ... TREC Deep Learning ... two to ten thousand rows ... three hundred ... five hundred ... distillation ... confusion matrix ... number to beat" |
| B7 t6 PEFT runs | "rank sixteen, alpha thirty-two, dropout five percent ... N F four, double quantization ... gradient checkpointing ... Three runs ... one e minus five ... agent review" |
| B8 t7 merge and serve | "loads the base in B F sixteen, even for the QLoRA adapter ... time to first token ... stretch goal" |
| B9 DoneWhen | "You're done when your LoRA layer passes those four checks ... all five" |
| M1 predictions method | "sixteen bytes per trained parameter, two per frozen ... about thirty trillion operations ... time one big B F sixteen matrix multiply" |
| M2 results table | "all five: base plus prompt, LoRA eight B, QLoRA eight B, LoRA one B, full fine-tuning one B"; forty-two million said earlier |
| M3 toy numbers | "two million, four hundred forty-two thousand, two hundred forty ... one point seven eight ... point oh oh oh one ... four hundred sixty thousand eight hundred ... point oh oh oh nine ... three quarters of a second" |
| M4 base's zero | B "totally clueless"; "pretty-printed the JSON ... point two four ... wasn't five times faster" |
| M5 count matches | "cheapest bug check" |
| M6 memory | "about sixteen gigabytes of weights ... gradient checkpointing ... under a gigabyte ... roughly a third ... Halve the sequence length" |
| M7 step time | "not two hundred times faster ... roughly two thirds ... B F sixteen and not thirty-two bit" |
| M8 task metric | "both should fix the format failures ... judgement is harder" |
| M9 general | "drop more for full fine-tuning than for LoRA, and more with more epochs" |
| M10 merged speed | "identical speed ... still running the PEFT wrapper" |
| K1 both zero / B random | "initialise both A and B to zero ... random kick in every layer" |
| K2 learning rates | "two e minus five ... barely learned ... two e minus four ... not-a-number" |
| K3 loss mask | "falls fast and looks great ... mask the end-of-turn token too ... max new tokens" |
| K4 format mismatch | "train in one format, serve in another ... Nothing's wrong with the weights" |
| K5 merge into 4-bit | "round-trip the merged weights through N F four ... falls back toward the base" |
| E1 one-minute LoRA | across I2-I21; B's closing restatement; A's correction |
| E2 why 8B doesn't fit | P4, F1, QLoRA section; closing "sixteen-byte bill only lands on forty-two million" |
| E3 scaling | B "how does all this scale?"; "two r over d ... intrinsic dimension ... seventy B ... four ... against six ... thousands per base" |
| E4 94% checklist | B "ninety-four percent ... I'd probably just ship it"; A's five checks |
| E5 B zero, alpha/r | I15, I16, K1 |
| G1 Go Deeper | "read the original LoRA paper ... LoRA Learns Less and Forgets Less ... the QLoRA paper" |
| C1 Connections | "prefix caching has to include the adapter's ID ... ninety-four against ninety-two ... D P O and G R P O" |

Numbers checked against the lesson. Derived for speech, not in the lesson: "eight times the room" (128 / 16);
"an eighth of a bit" (the lesson's 8/64 term); the Measure worked example "eight sequences of five
hundred tokens, about thirty trillion operations per step" (6 x 1.24B x 4,000); "one in a hundred
thousand" for 1e-5.
