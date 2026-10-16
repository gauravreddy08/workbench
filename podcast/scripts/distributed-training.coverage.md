# Coverage: distributed-training

Every outline item -> where it lands in podcast/scripts/distributed-training.md (a few quoted words). No MISSING.
Numbers checked against src/lessons/distributed-training.mdx.

| Item | Lands in script |
| --- | --- |
| T1 prereqs re-explained | "Quick refresher on why ... about sixteen bytes per parameter"; "remember, separate processes don't share memory"; "the same shape as RAM versus disk versus network"; "Remember p ninety-nine, the slowest one percent" |
| P1 scene | "your cross-encoder ... a few hundred million parameters ... seventy billion ... fifteen trillion tokens ... one thousand and twenty-four H one hundreds" |
| P2 memory | B "two bytes ... a hundred forty gigabytes"; A "one point one terabytes. Against eighty ... a hundred twenty-eight on the Spark, that's the spec sheet number ... off by more than ten ... before you count activations" |
| P3 time | "six N D ... two operations per parameter going forward, and about four going backward ... flops. One multiply, or one add ... six point three times ten to the twenty-four ... nine hundred eighty-nine trillion ... forty percent ... one point six times ten to the ten seconds"; "About five hundred years"; "thousands of years" |
| P4 scale | "a hundred eighty days ... sixteen thousand GPUs, about eleven days"; "behave like one enormous GPU ... cables that are much slower than their own memory" |
| F1 figure 001 | "on the left there's one long bar ... eleven hundred twenty gigabytes ... On the right, the time, on a log scale ... Split it, or don't do it" |
| P5 waiting GPUs | "assumes the GPUs never wait for each other ... a GPU you're paying for and not using" |
| O1 AlexNet | "Twenty twelve, AlexNet ... two G T X five eighties ... three gigabytes each ... split it by hand" |
| O2 parameter servers | "parameter server. A few machines held the weights ... the servers became a traffic jam" |
| O3 ring / Horovod | "twenty seventeen, Baidu ... Patarasuk and Yuan ... two thousand nine ... Horovod" |
| O4 Megatron, GPipe, ZeRO | "Megatron L M split each layer's matrices ... G Pipe split the layers into stages ... ZeRO, twenty nineteen into twenty twenty ... GPT three to Llama three" |
| A1-A2 analogy | "a class working through a really long problem set ... data parallelism ... tensor parallelism ... pipeline parallelism"; "matching the kind of talking to the kind of cable" |
| C1 rank, world size | "its rank, from zero up to ... the world size" |
| C2 collectives, NCCL, gloo | "a function that every rank calls at the same moment ... NCCL, N C C L, people say nickel ... rings or trees ... gloo, from Meta ... plain TCP" |
| C3 five collectives / F2 | "Picture four GPUs, before and after. Broadcast ... once, at the very start ... Reduce ... All-reduce ... the workhorse"; "Reduce-scatter ... All-gather" |
| C4 RS + AG = AR | "A reduce-scatter followed by an all-gather is an all-reduce ... It'll come back twice" |
| R1 naive | B "everyone sends their gradient to one GPU"; A "a hundred forty-three terabytes per step ... gets worse as you add GPUs" |
| PR1 predict ring bytes | B "It has to grow, right?"; A "about two S ... doesn't grow with N ... one and a half ... one point nine nine eight" |
| R2 ring mechanism | "Arrange the GPUs in a circle ... cut every GPU's gradient into N equal chunks ... staggered ... owning one chunk that's fully summed ... all-gather ... just overwrites its stale copy" |
| F3 figure 003 | "a little grid to play with, GPUs as rows, chunks as columns ... drag N from four up to eight ... never past it" |
| R3 time model | "That's latency ... That's bandwidth. The pipe's width ... bandwidth part is flat in N. The latency part grows"; "two thousand and forty-six hops ... tree algorithms ... hierarchically ... bandwidth-optimal" |
| R4 bus bandwidth | "bus bandwidth ... cancels out N ... as well as physics lets it" |
| D1 DP steps | "examples zero through thirty-one ... thirty-two through sixty-three ... all-reduce the gradients and divide by N ... Without ever sending the weights" |
| D2 DDP exact | B "that's an approximation"; A "it's exact ... gradient of an average is the average of the gradients ... seven decimal places"; "D D P ... broadcasts the starting weights from rank zero" |
| D3 buckets overlap | "last layer to the first ... buckets, twenty-five megabytes each by default ... Bigger buckets waste less ... Smaller ones start talking sooner" |
| PR2 predict DP 70B | "fifty gigabytes a second ... three and a half seconds"; B "five and a half"; A "Five point six ... one point one terabytes ... great for your cross-encoder, and hopeless" |
| Z1 16 bytes | "Two for the B F sixteen weights ... Two for the gradients ... master copy ... first moment ... momentum ... second moment ... twelve of the sixteen are optimizer state. Three times as big" |
| Z2 ZeRO, shard | "Zero Redundancy Optimizer ... DeepSpeed ... Rajbhandari ... Shard just means cut it into N pieces" |
| Z3 stage 1 | "Stage one, shard the optimizer state ... reduce-scatter ... all-gather the new B F sixteen weights"; "exactly the same bytes ... for free" |
| Z4 stage 2 | "Stage two, also shard the gradients ... Still the same communication" |
| Z5 stage 3 | "Stage three ... Just-in-time weights ... one and a half times the communication" |
| F4 figure 004 | "sixteen ... four plus three, seven ... five and a half ... four ... twice the model. Stage three about three times ... about one gigabyte for a seventy B model's training state" |
| Z6 FSDP | "F S D P, Fully Sharded Data Parallel ... fully shard ... F S D P two ... prefetches the next block's weights" |
| Z7 FSDP limits, activations | B "F S D P basically solves the memory problem"; A "all-gathers and reduce-scatters the whole model ... activations ... ninety gigabytes ... split the layers themselves" |
| TP1 Megatron | "Megatron L M, Shoeybi and colleagues, twenty nineteen" |
| TP2 MLP split | "four times the hidden size. Apply GeLU ... Split the first matrix by columns ... element by element ... second matrix by rows ... partial sum" |
| F5 figure 005 | "If you drew it, the input comes in on the left, the same copy on both GPUs. Two lanes ... no comm needed ... the all-reduce" |
| TP3 attention | "Each GPU takes a subset of the heads ... queries, keys and values ... split by columns ... output projection is split by rows ... two all-reduces in the forward pass and two in the backward" |
| TP4 what and how often | "sixty-four megabytes. Four times per block. Eighty blocks. Every micro-batch ... nothing hides them" |
| L1 cable numbers | "H B M ... over three thousand ... three point three terabytes ... about four hundred fifty"; B "I thought NVLink was nine hundred"; A "counts both directions ... B two hundreds ... nine hundred one way, one point eight terabytes ... InfiniBand ... R D M A ... four hundred gigabits ... one card per GPU ... four hundred gig Ethernet ... Meta trained Llama three on both"; "ten gigabit ... one and a quarter gigabytes" |
| L1 PCIe 5 ~64 GB/s | "the plain slot connecting a GPU to its CPU or its network card, PCIe, is about sixty-four" |
| L2 bits/bytes, 10x | "Divide by eight ... about ten times faster ... ten to one" |
| L3 Spark NIC | "ConnectX seven ... two ports ... twenty-five gigabytes a second ... user guide ... check the current doc ... two hundred seventy-three ... spec sheet ... same shape" |
| PP1 split by depth | "GPU zero gets layers one through twenty ... one message ... tolerate the slower links" |
| PP2 bubble | B "they're all working at once"; A "one GPU is working and the rest are waiting ... the pipeline bubble" |
| PP3 GPipe micro-batches, formula | "G Pipe, Huang ... micro-batches ... fills up, runs full ... drains ... stages minus one, and divide by the number of micro-batches plus the number of stages minus one" |
| PR3 predict bubble | B "Seven over ... fifteen"; A "Forty-seven percent ... Sixty-four micro-batches ... At least four times ... eats into your global batch size" |
| F6 figure 006 | "Picture it as a timeline. Each row is a GPU ... B boxes are twice as wide ... matches that ratio exactly ... a toggle between two schedules" |
| PP4 GPipe vs 1F1B, interleaved | "stage zero has to store the activations for every micro-batch ... one F one B ... PipeDream, Narayanan ... never holds more than the number of stages ... interleaved version ... more messages" |
| X1 placement | "Tensor parallelism inside a server. Eight ... Pipeline parallelism across servers ... data parallelism on the outside ... ZeRO stage one or F S D P"; B "the chattiest thing gets the fastest cable" |
| X2 product, mesh | "product of the three ... data parallel is sixteen ... three coordinates ... device mesh" |
| X3 Llama 3 405B | "four hundred and five billion ... sixteen thousand three hundred eighty-four ... eight, pipeline sixteen, data parallel one hundred twenty-eight ... roughly forty percent" |
| SQ1 sequence parallelism | "layer norm and dropout ... Korthikanti ... twenty twenty-two ... reduce-scatter plus an all-gather"; "Same bytes again. Free memory" |
| SQ2 context parallelism | "a hundred twenty-eight thousand tokens ... keys and values get passed around a ring ... ring attention, Liu ... twenty twenty-three ... long-context phase" |
| FL1 Llama 3 failures | "fifty-four day stretch ... four hundred sixty-six ... Four hundred nineteen ... seventy-eight percent ... eight unplanned failures a day"; B "It drops out"; A "the all-reduce needs every single GPU" |
| FL2 checkpoint | "Weights, optimizer state, where the data loader was, random seeds, the step number ... one point one terabyte ... its own shard ... asynchronous checkpointing ... in a second or so" |
| FL3 Young/Daly | "Young, nineteen seventy-four ... Daly ... square root of two times the checkpoint cost times the mean time between failures ... about nineteen ... half an interval" |
| FL4 elastic, rendezvous | "elastic training ... torchrun ... rendezvous ... spare nodes on standby ... restart time matters ... design-doc problem" |
| FL5 stragglers | "A straggler ... throttling ... retransmitting ... noisy neighbour ... the max over all of them ... kick out the slow node" |
| FL6 silent errors | "returns wrong numbers without crashing ... loss spike, or NaNs ... heart monitor" |
| B0 fake cluster | "torchrun starts several Python processes ... gloo ... same code ... backend switched to NCCL" |
| B1 setup, hello, loopback | "two point six up ... two point fourteen ... every process prints six ... gloo socket ifname ... minutes to seconds" |
| B2 ring task | "Work them out on paper for three GPUs ... rank r sends chunk r minus s, wrapping around ... Deadlock ... isend ... a million and three elements"; B "should match ... exactly"; A "Floating-point addition isn't associative ... one in a million" |
| B3 timing task | "four kilobytes, sixty-four, one megabyte, sixteen, sixty-four. Warm up once, average twenty runs, barrier ... predict ... fixed latency from the smallest message, the bandwidth from the largest" |
| B4 DDP check | "same seed everywhere ... sixty-four examples ... mean squared error ... sum instead of a mean? Or if the slices had different sizes?" |
| B5 FSDP peek | "D Tensor ... two fifty-six by two fifty-six ... sixty-four by two fifty-six ... hooks that fire before each layer ... duplicate GPU error ... stay on gloo and CPU" |
| B6 TP MLP | B "All-reduce. Partial sums."; A "why is it fine to apply GeLU ... split the first matrix by rows instead ... relative tolerance" |
| B7 pipe | "twenty millisecond sleep ... one, four and sixteen micro-batches" |
| B8 plan.py | "eighty layers, hidden size eight thousand one hundred ninety-two ... about four million tokens ... fifty percent utilization ... NVLink about four fifty, between nodes about fifty ... with and without ZeRO stage one ... mark which ones fit" |
| B9 one-page plan | "write one page, for a reader who's going to decide from it ... checkpoint interval ... two measurements ... first hour ... skeptical senior engineer" |
| B10 done-when | folded into B2-B9 (matches to one in a million, seven decimal places, shard shapes, bubble shrinking, table and page) |
| M1 Mac timings | "one point three milliseconds ... two point three"; "forty-eight ... a hundred two"; "a hundred two ... a hundred thirty-six ... twenty-six against thirteen" |
| M2 latency-bound small | "sixteen times bigger ... Six hops ... about a millisecond ... a few microseconds ... a thousand times smaller ... twenty-five megabyte buckets" |
| M3 bandwidth ceiling | "two to three times for four times the data ... about one gigabyte a second ... three quarters of one ... a few hundred gigabytes a second" |
| M4 ring vs gloo | "noisy ... don't read anything into the ranking. Read the shape" |
| M5 DDP diff | "three times ten to the minus eight ... two point nine eight ... all four ranks" |
| M6 FSDP shapes | "sixty-four by two fifty-six ... Exactly a quarter" |
| M7 pipe numbers | "zero point eight, zero point five four, and zero point three two ... zero point seven five, zero point four three, and zero point one six ... about a millisecond ... don't use more stages than you need" |
| M8 calculator | "three and a half seconds ... five point six ... eleven hundred twenty ... two eighty-one ... two thirds ... seven tenths ... a hundred forty ... thirty-six ... eight and a half percent ... three point eight ... thirty-five ... under ten ... ten percent ... eight hundredths ... eighteen ... about five"; "almost thirteen seconds. Twenty times worse"; "almost thirty-two percent ... a third of the cluster" |
| M9 no single answer, activations | "there isn't one right answer ... no bubble at all ... cuts each GPU's gradient traffic four to eight times ... thirty-four times the hidden size ... one point one gigabytes ... divides that by eight ... up to the number of stages ... eighty gigabytes" |
| M10 days | "three point nine seconds ... four point two million ... three point six million steps ... a hundred sixty days ... assumed forty ... isn't a plan" |
| K1 deadlock | "gloo buffers small messages ... sixty-four megabytes it hangs forever ... data-dependent if ... zero percent GPU ... debug mode, set to detail ... NCCL's timeout" |
| K2 gradient equivalence | "sum instead of a mean ... one quarter of the right gradient ... ten examples and the others eighteen ... quietly different" |
| K3 no seed | "drift apart from step one ... D D P broadcasts rank zero's weights ... doing real work" |
| K4 TP on slow link | "sixteen or thirty-two ... tens of seconds ... twenty-five gigabytes ... one and a quarter ... which layouts survive" |
| E1 both reasons | Problem section (P2, P3) |
| E2 ring | R2-R3 plus M2 ("trees", "hierarchically", "buckets") |
| E3 DDP/ZeRO/FSDP | Z1-Z7 ("Sharding weights doesn't shrink that at all") |
| E4 scale to 16,384 | "grow data parallel by sixteen ... compute per step shrinks sixteen times ... stays roughly flat ... bubble worse ... a ceiling before the model starts converging worse ... rebalance the pipeline ... a couple a day to one every few hours" |
| E5 failure design | FL1-FL6 plus "goodput. The fraction of wall-clock time that went into steps you actually kept" |
| G1 sources | "infrastructure sections of the Llama three paper ... Ultra-Scale Playbook" |
| CN1 connections | "training a small language model end to end with D D P on the Spark ... a design doc someone can approve" |
