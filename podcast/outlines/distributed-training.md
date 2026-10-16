# Outline: distributed-training

Source: src/lessons/distributed-training.mdx. Curriculum: "Training on many GPUs." Question: how do you
split a model and its training across many GPUs? Build: simulate data, tensor and pipeline parallelism
with processes; write down how each scales.

Diagnostic gaps hit: numbers (bandwidth, bytes, gigabits vs gigabytes, "how does it scale?"), memory
math for models (16 bytes per parameter re-derived), processes (ranks are separate processes with no
shared memory). B voices wrong models: "all-reduce means everyone sends to one GPU", "more GPUs means
each sends more", "averaging per-GPU gradients is an approximation", "FSDP solves memory, so done",
"just make tensor parallelism span all the GPUs", "pipeline stages all work at once automatically",
"a dead GPU just drops out", "900 gigabytes a second is NVLink per direction", "the ring adds in the
same order so the answer should be exact".

Each item: what is taught -> how it is said aloud.

## Today / prerequisites

- T1 Prereqs re-explained in place: 16 bytes per parameter (training-memory), processes don't share memory (processes lesson), latency-plus-size-over-bandwidth (latency-numbers), p ninety-nine / tail latency. -> A, a sentence each where first needed. Today list not read.

## The Problem

- P1 Cross-encoder fits on the Spark: a few hundred million params, an epoch an hour. Real job: 70B, 15 trillion tokens, 1,024 H100s. -> A opens with the scene.
- P2 Memory: ~16 bytes/param Adam mixed precision -> 70B x 16 = ~1.1 TB; H100 80 GB; Spark 128 GB (spec); off by >10x before activations. -> A; B guesses "two bytes a param, 140 GB" and A corrects.
- P3 Time: 6ND (term: 2N forward + 4N backward per token) = ~6.3 x 10^24 FLOPs (term: one multiply or add). H100 ~989 trillion bf16/s peak dense, ~40% real -> ~1.6 x 10^10 s = ~500 years. Spark: thousands of years. -> A works it in words.
- P4 1,024 GPUs perfectly used: ~180 days; 16,000: ~11 days. Job is "make 1,024 GPUs behave like one", over cables slower than their own memory. -> A.
- F1 Figure 001: memory bars (1,120 GB vs 80 vs 128, plus activations) and log-scale time bars (500 years, 180 days, 11 days), "assumes GPUs never wait". -> A, short, folded into P2-P4.
- P5 Waiting GPUs are paid-for, unused GPUs; that's where the engineering lives. -> A.

## Origin

- O1 2012 AlexNet: two GTX 580s, 3 GB each, split by hand. -> A story.
- O2 Parameter servers: few machines hold weights, workers push grads, pull weights; servers jam. -> A.
- O3 2017 Baidu: ring all-reduce from supercomputing (Patarasuk and Yuan proved bandwidth-optimal 2009); Uber's Horovod for TensorFlow and PyTorch. -> A.
- O4 Models outgrew one GPU: Megatron-LM 2019 (split each layer's matrices inside a server); GPipe 2019 (layers as stages, assembly line); ZeRO 2019-2020 (stop redundant copies). Every big model since, GPT-3 to Llama 3, combines all three. -> A.

## The Idea: analogy

- A1 Class, long problem set, one answer key per page. Data parallel = full book each, different problems, average answers. Tensor = tear each page in half, shout partials. Pipeline = chapters down the row, assembly line. -> A, brief (exact comparison, then dropped).
- A2 Each costs a different kind of talking; match talking to the cable. -> A.

## Collectives

- C1 Every GPU runs the same script as its own process; rank (term, 0..world-1); world size (term). No shared memory. -> A; re-explain processes.
- C2 Collectives (term): every rank calls at the same moment, returns when group done. NCCL ("nickel", NVIDIA, NVLink/PCIe/NICs, rings/trees); gloo (Meta, CPU, TCP, runs on Mac). -> A.
- C3 Five collectives: broadcast (one has it, all get copy; used once at start for identical weights); reduce (sum lands on one); all-reduce (everyone gets sum; workhorse of DP); reduce-scatter (each gets sum of one slice); all-gather (each has a slice, everyone gets all). -> A, one at a time with four GPUs in mind.
- F2 Figure 002: before/after rows for four GPUs. -> described as "four GPUs, before and after" inline in C3.
- C4 Reduce-scatter then all-gather IS an all-reduce; that's how the fast all-reduce works and ZeRO's whole trick. Hold onto it. -> A, flagged as callback.

## Ring all-reduce

- R1 Naive: all to GPU 0, sums, sends back; GPU 0 receives and sends (N-1) x S; N = 1,024, 140 GB -> 143 TB per step; grows with N. Parameter-server jam. -> B voices the naive model as their own; A runs the numbers.
- PR1 Predict: bytes each GPU sends, grows with N? Answer ~2S, flat; precisely 2(N-1)/N x S: 1.5S at 4, 1.998S at 1,024. -> A asks, B guesses "grows with N", A reveals.
- R2 Ring: send right, receive left; cut into N chunks. Reduce-scatter phase N-1 steps: send a chunk, receiver adds; staggered so no two on same chunk; ends with each GPU owning one fully summed chunk. All-gather phase N-1 steps: forward finished chunk, overwrite. -> A walks it with N = 4, concrete.
- F3 Figure 003 interactive: rows GPUs, columns chunks, fill = contributions; step through; slider N 2-8: steps grow, per-GPU sent stays just under 2x. -> A "picture a grid... drag N".
- R3 Byte count: 2(N-1) steps x S/N; all links busy at once. Time = bandwidth term (~2S/B, flat) + latency term (2(N-1) hops x alpha, grows). Latency term (term: fixed cost per message), bandwidth (term: pipe width). 2,046 hops at 1,024; NCCL trees and hierarchical rings. -> A in words, no formula read; tie to latency-numbers lesson.
- R4 Bus bandwidth (term): size x 2(N-1)/N / time; near link speed = physics limit. -> A.

## Data parallelism

- D1 Full copy per GPU; four steps: different slice of batch (0-31, 32-63), forward/backward, all-reduce and divide by N, same optimizer step, copies stay identical without sending weights. -> A.
- D2 DDP (term). Exact, not approximate: loss is average over examples, so average of per-slice grads = full-batch grad; checked to 7 decimal places. -> B voices "approximation"; A corrects.
- D3 Overlap: backward produces grads last layer first; buckets (term, 25 MB default; bigger less latency waste, smaller start sooner) all-reduced as soon as full; comm hides behind compute. -> A.
- PR2 Predict: DP only, 70B, 1,024 GPUs, 50 GB/s link, bf16 grads; all-reduce time; hide behind ~3.5 s compute? Answer S = 140 GB, ~5.6 s, longer than compute; plus 1.1 TB per GPU. Fine for cross-encoder, hopeless for 70B. Both say stop giving every GPU full copy. -> A asks, B works it.

## ZeRO and FSDP

- Z1 16 bytes: bf16 weights 2, bf16 grads 2, fp32 master 4 (tiny updates not rounded away), Adam first moment 4 (momentum), second moment 4 (squared grad avg); 12 of 16 optimizer state (term, 3x weights). -> A as a spoken sum; re-explains training-memory.
- Z2 N identical copies; ZeRO (term, Microsoft DeepSpeed, Rajbhandari et al. 2019); shard (term). Each GPU only needs to update its own 1/N. -> A.
- Z3 Stage 1: shard optimizer state; reduce-scatter grads, update slice, all-gather new bf16 weights; same bytes as DDP; free memory. -> A; callback to C4.
- Z4 Stage 2: also shard gradients; same comm. -> A.
- Z5 Stage 3: shard weights; all-gather each layer just in time, free; extra all-gather in backward; ~1.5x DDP comm. -> A.
- F4 Figure 004: four GPUs bytes/param: DDP 16, ZeRO-1 7 (4 + 12/4), ZeRO-2 5.5, ZeRO-3 4; comm DDP=Z1=Z2 ~2x model, Z3 ~3x. At 1,024 GPUs stage 3 ~1 GB per GPU for 70B before activations. -> A walks the four numbers.
- Z6 FSDP (term: PyTorch ZeRO-3; fully_shard / FSDP2; DTensor sharded on first dim): wrap each block; all-gather before block; prefetch next block. -> A.
- Z7 FSDP doesn't fix the slow-network all-gather/reduce-scatter of whole model, nor activations (term). One 4,096-token sequence through 70B ~90 GB activations (standard estimate). Must split layers themselves. -> B voices "so FSDP solves it"; A corrects.

## Tensor parallelism

- TP1 Most compute: two matmuls per block in MLP, a few in attention. Megatron-LM (Shoeybi et al. 2019). -> A.
- TP2 MLP: first matrix expands hidden to 4x, GeLU, second shrinks back. Split first by columns: each GPU half the outputs; GeLU elementwise so no comm. Split second by rows: each GPU partial sum (matmul is sum over inner dimension). All-reduce partial sums. -> A in words with two GPUs; no symbols.
- F5 Figure 005: X same on both, X times A1 / A2, GeLU, Y times B, all-reduce, Z. -> described over the phone.
- TP3 Attention: subset of heads per GPU (column-split Q K V projections), row-split output projection, one all-reduce. Two all-reduces forward, two backward per block. -> A.
- TP4 What and how often: activations, tokens x hidden x 2 bytes: 4,096 x 8,192 -> 64 MB, four times per block, eighty blocks, every micro-batch; blocking (next layer waits), can't hide. Only on fastest links. -> A.

## Cables

- L1 HBM 3,000+ GB/s (H100 ~3.3 TB/s); NVLink 4 (term) ~450 GB/s per direction (900 marketed counts both); NVLink 5 B200 ~900 (1.8 TB/s both); PCIe 5 x16 ~64; InfiniBand NDR (term: supercomputer network, RDMA) ~50 GB/s (400 Gb/s), one card per GPU; 400 GbE RoCE ~50, Meta used both for Llama 3; Spark ConnectX-7 ~25 GB/s (200 Gb/s); 10 GbE ~1.25 GB/s. -> A picks the ones that matter, says each with a comparison; B voices "900 per direction".
- L2 Gigabits divide by 8. Inside server ~10x faster than to next server; that ratio places everything. -> A; B asks for the rule.
- L3 Spark NIC (term: ConnectX-7, two QSFP ports); NVIDIA guide for two-Spark cluster (check current doc); link ~10x slower than Spark's ~273 GB/s memory (spec). Same shape, smaller scale. -> A ties to his machine.

## Pipeline parallelism

- PP1 Cut by depth: GPU 0 layers 1-20, GPU 1 21-40; one point-to-point message per boundary per micro-batch; tolerates inter-server links. -> A.
- PP2 With one batch, one GPU works, rest wait; reverses in backward. Pipeline bubble (term). -> B voices "they all work at once"; A corrects.
- PP3 GPipe (Huang et al. 2019): micro-batches (term); line fills, runs, drains. Bubble = (p-1)/(m+p-1), said in words with an example. -> A.
- PR3 Predict: 8 stages, 8 micro-batches -> 7/15 ~47%; under 10% needs m >= 64; rule: m at least 4x stages; eats global batch. -> A asks, B guesses, A works it.
- F6 Figure 006 interactive: rows = stages, F and B (B twice as long); slider p and m; measured idle matches formula; fill/drain triangles. GPipe vs 1F1B toggle: same bubble, stage 0 stores far fewer micro-batches. -> A "picture a timeline... drag m".
- PP4 GPipe stores all m micro-batches' activations on stage 0; 1F1B (PipeDream, Narayanan et al.) backward ASAP, alternate, never more than p; interleaved variant: several non-adjacent chunks per GPU, smaller bubble, more messages. -> A.

## 3D parallelism

- X1 TP inside server (8 on 8-GPU box; past 8 = 10x slower network). PP across servers, choose p so weights and activations fit. DP outermost with ZeRO-1 or FSDP; once per step, overlaps backward, slowest tier. -> A; B tries to say the rule.
- X2 G = TP x PP x DP; 1,024 with TP 8, PP 8 -> DP 16. Three coordinates; TP group = 8 in a box; DP group = 16 at same position across replicas. Device mesh (term). -> A.
- X3 Llama 3 405B on 16,384 H100s: TP 8, PP 16, DP 128, ~40% of peak (roughly, from their table). -> A.

## Sequence / context parallelism

- SQ1 Layer norm, dropout not split by TP so every TP rank stores full activations; sequence parallelism (Korthikanti et al. 2022) splits along sequence; all-reduce -> reduce-scatter + all-gather, same bytes; free memory, same trick as ZeRO. -> A, callback.
- SQ2 Context parallelism for 128K+: split the sequence; keys and values passed around a ring so every query block sees every key block (ring attention, Liu et al. 2023); ring idea again; Llama 3 long-context phase. -> A.

## Failures

- FL1 Llama 3: 54 days, 16,384 GPUs, 466 interruptions, 419 unexpected, ~78% hardware (GPUs, GPU memory, network links, hosts) -> ~8 a day, one every three hours. Synchronous: one dead GPU stops 16,383. -> B voices "it just drops out"; A corrects.
- FL2 Checkpoint (term: weights, optimizer state, data loader position, seeds, step) = 1.1 TB; sharded save, each GPU its own shard (distributed checkpointing); async: copy to CPU in a second, write in background. -> A.
- FL3 Young 1974 / Daly: interval ~ square root of two x checkpoint cost x mean time between failures; 1 min, 3 h -> ~19 min; each failure costs half an interval plus restart. -> A in words with the worked example.
- FL4 Elastic training (term) via torchrun; rendezvous (term); restart group, resume from checkpoint; spare nodes standby; restart time (load 1.1 TB, NCCL init over 1,024, warm-up) many minutes x 8 a day; design-doc problem. -> A.
- FL5 Stragglers (term: hot throttling GPU, flaky link retransmitting, noisy neighbour); step = max over 1,024 = tail latency again; track per-rank step times, kick slow node. -> A; re-explain p ninety-nine.
- FL6 Silent errors: wrong numbers, no crash; loss spikes or NaNs; watch loss like a heart monitor. -> A.

## Build It

- B0 Fake cluster with processes: torchrun starts processes with ranks, gloo over local TCP; slow but same code as nccl on 1,024, same correctness. -> A.
- B1 Setup: venv, PyTorch 2.6+ (tested 2.14); hello world: each rank contributes its rank, all-reduce sums: 0+1+2+3 = 6. Startup hang: pin gloo to loopback (GLOO_SOCKET_IFNAME lo0 mac / lo linux), minutes to seconds. -> A one or two sentences.
- B2 Ring from send/recv: chunk indices on paper for n=3; in reduce-scatter step s rank r sends chunk (r - s) mod n; deadlock if every rank blocking-sends first, use isend, recv, wait; uneven last chunk (1,000,003 elements), receive buffer must match; diff ~10^-6 not zero (float addition not associative). -> A; B voices "should be exact".
- B3 Time against size 4 KB-64 MB, warm up, average 20, barrier; bus bandwidth; predict whether 4 KB is 1,000x less than 4 MB; fit alpha from smallest, B from largest. -> A.
- B4 DDP check: same seed init, full batch 64x32, reference full-batch MSE vs DDP on 1/world slice; max grad diff; agent review: sum vs mean, unequal slices. -> A.
- B5 FSDP peek: 4 CPU processes, fully_shard each of four 256x256 linears; DTensor (term) global (256,256), local (64,256); all-gather in forward pre-hooks; sum local numel vs full. Spark: one rank on GPU works but nothing sharded; two NCCL ranks on one GPU refused (duplicate GPU) -> stay on gloo/CPU. -> A.
- B6 TP MLP on two ranks: column slice A, row slice B, one collective; why GeLU before comm is fine; what if A split by rows; allclose relative tolerance because outputs large. -> A; B answers which collective.
- B7 Pipe: four processes, sleep 0.02 s as a layer, forward only, m = 1, 4, 16; ideal (m + p - 1) x 0.02. -> A.
- B8 plan.py: 70B, 80 layers, hidden 8,192, seq 4,096, global batch 1,024 sequences (~4M tokens); H100 989 TFLOP/s, 50% util, 80 GB, 8/node; NVLink ~450, inter-node ~50. Compute, bubble, TP comm, DP comm, memory with/without ZeRO-1; configs list; add activation estimate. -> A; "the one that matters in an interview".
- B9 One-page plan: layout and why, step time, days to 15T, checkpoint interval, node death, two first-hour measurements; skeptical-senior review: which assumption flips the decision. -> A.
- B10 Done when: ring ~10^-6 + timing table; DDP ~10^-8; FSDP shard shapes; TP matches, pipe bubble shrinks; plan table + one page. -> folded into the above, not read as a list.

## Measure

- M1 Mac reference, 4 gloo processes: 4 KB ring 1.3 ms / gloo 2.3; 64 KB 2.9 / 2.3; 1 MB 26 / 13; 16 MB 48 / 39; 64 MB 102 / 136, bus bw up to ~0.74 GB/s. -> A says a few, not row by row.
- M2 Small messages all latency: 4 KB and 64 KB same time, 16x apart; six hops of ~1 ms through local TCP and Python; NCCL NVLink alpha a few microseconds, 1,000x smaller, same shape; why 25 MB buckets. -> A.
- M3 Big messages approach ceiling: 16 to 64 MB time 2-3x for 4x data; ~1 GB/s local TCP; H100 node NCCL all_reduce_perf few hundred GB/s; same curve, hundreds of times higher. -> A.
- M4 Ring may beat gloo at large sizes; noisy; read the shape not the ranking. -> A.
- M5 DDP diff ~3 x 10^-8 (2.98 x 10^-8 on all four ranks); float32 rounding from order. -> A.
- M6 FSDP: (64, 256) of (256, 256), exactly a quarter along dim 0. -> A.
- M7 Pipe measured 0.80, 0.54, 0.32 for m = 1, 4, 16 vs formula 0.75, 0.43, 0.16; gap = ~1 ms per hop; trend is the point; real pipelines pay hop cost, don't use more stages than needed. -> A.
- M8 Calculator rows: pure DP 1,120 GB / 281 with ZeRO-1, DP comm 5.59 s > 3.48 compute; TP8 PP1 DP128: 0.67 TP, 0.69 DP, 140 / 36 GB; TP8 PP4: bubble 8.6%, 3.81 compute, 35 / 9.6 GB; TP8 PP8: 9.9%, 3.86, 0.08 DP, 18 / 5.2 GB; TP16: TP comm 12.9 s (20x worse); TP2 PP16: bubble 31.9%, 5.11 s. -> A walks the story, not the table.
- M9 No one right answer among TP 8 rows: PP1 + ZeRO-1 no bubble, wins on paper if 0.69 s hides and activations fit; PP 4-8 pays 9-10% bubble but cuts grad traffic 4-8x and memory headroom. Activations: ~34 x hidden bytes per token per layer bf16 (Korthikanti) -> ~1.1 GB per 4,096-token sequence per layer; TP 8 with sequence parallelism divides by 8; times layers per stage and micro-batches held (up to p in 1F1B); check vs 80 GB. -> A + B weigh it.
- M10 ~3.9 s/step, ~4.2M tokens/step, 15T -> ~3.6 million steps, ~160 days at 50% (vs Figure 001's 180 at 40%). A plan without days isn't a plan. -> A.

## Break It

- K1 Deadlock: blocking send; small tensors may work (gloo buffers), 64 MB hangs; real jobs hang when ranks disagree on next collective (data-dependent if); 0% GPU, no error; TORCH_DISTRIBUTED_DEBUG=DETAIL and NCCL timeout. -> "what if" exchange.
- K2 reduction=sum: DDP still averages -> 1/world of the right gradient. Unequal slices (10 vs 18): mean of means isn't global mean. Training runs, loss drops, model quietly different. -> exchange.
- K3 No seed: hand-rolled all-reduce DP drifts from step one; DDP still matches because it broadcasts rank 0's weights; the broadcast does real work. -> exchange.
- K4 TP = 16 or 32 in plan.py: TP comm from under a second to tens of seconds; inter-node to 25 GB/s and 1.25 GB/s; which survive. -> exchange.

## Explain It Back (substance must appear)

- E1 Both reasons with numbers (16 B, 1.1 TB vs 80 GB, activations on top; 6ND, ~500 years; thousands of GPUs for state and months). -> covered in Problem.
- E2 Ring: chunks, two phases, 2(N-1)/N flat; time ~2S/B; steps grow -> latency for small messages; trees, hierarchical rings, buckets. -> covered in ring + measure.
- E3 DDP vs ZeRO 1/2/3 vs FSDP: what each shards, costs; none shrink activations. -> covered in ZeRO.
- E4 Layout for 1,024 in 128 nodes of 8; scale to 16,384: keep TP and PP, grow DP 16x; compute per step shrinks 16x, DP all-reduce flat, global batch grows unless shrink per-replica share which worsens bubble; larger batch has convergence ceiling or rebalance PP; failures from a couple a day to one every few hours. -> new exchange near the end.
- E5 Failure design: sharded async checkpoints, Young ~20 min, automatic restarts with hot spare, fast restart, stragglers, loss spikes/NaNs silent corruption; goodput (fraction of wall-clock in steps you kept). -> failures section + goodput named.

## Go Deeper / Connections

- G1 Best sources: Llama 3 paper infrastructure sections; Hugging Face Ultra-Scale Playbook. -> one sentence.
- CN1 Next: tiny LM with DDP on the Spark (launch, seeding, checkpointing); design docs for the failure plan. -> one sentence.

## Flow

Problem (P1-P5, F1) -> Origin -> analogy -> collectives -> naive vs ring (Predict 1, figure) -> data
parallel (Predict 2) -> ZeRO/FSDP -> tensor parallel -> cables -> pipeline (Predict 3, figure) -> 3D
layout -> sequence/context -> failures -> Build It (processes, ring, timing, DDP, FSDP, TP, pipe,
calculator, plan) -> Measure -> Break It -> scaling to 16K (E4) and goodput -> pointers -> B restates,
A sharpens.
