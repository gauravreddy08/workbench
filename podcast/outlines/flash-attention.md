# Outline: flash-attention

Source: src/lessons/flash-attention.mdx. Curriculum: "FlashAttention and kernels." Why is attention
slow on long contexts, and how does FlashAttention fix it without changing the math?

## The one big idea

Long-context attention isn't slow because of the math. It's slow because of a giant scratch table
of scores that gets written out to main memory and read back, only because separate GPU programs
can't hand data to each other any other way. Softmax seemed to need the whole row at once, which
forced the table out. The online softmax (a running max and a running sum you rescale whenever the
max goes up) lets you see a row one piece at a time and still get the exact answer, so the whole
thing fits in one program that keeps every tile on the chip.

## Opening scene

His own Llama implementation, pointed at a long document. Short inputs fine, medium slow with the
GPU's math units mostly idle, long ones crash the Spark out of memory on the first layer, even with
all its memory. The strange part: the inputs and the output are small. The giant thing is an
intermediate you compute, use once, and throw away.

## Wrong mental models B voices

1. "Attention is quadratic, so the fix has to be doing less math or approximating." The history:
   a wave of approximations cut the math and mostly didn't get faster. FlashAttention does the same
   math, sometimes more, and wins on bytes.
2. "It's a big matrix multiply, so it's compute-bound." A: its output is far bigger than its inputs;
   writing the output is the bottleneck.

## Story beats

1. The crash. Small inputs and outputs, enormous throwaway table.
2. History: everyone counted math; approximations; Tri Dao and colleagues at Stanford say count the
   bytes; exact, faster, long sequences practical. The softmax trick from an NVIDIA note.
3. The memory ladder on a GPU in plain words: tiny fast scratchpad next to the math, big slow main
   memory. Kernels can only pass data through main memory. The obvious version is three programs,
   and the table goes out and back between each. Re-explain memory-bound in a sentence.
4. Fuse it into one program. Easy for simple steps; softmax is the blocker, because each output
   needs the sum over the whole row, and the row won't fit on the chip.
5. Safe softmax: subtract the row's biggest number so nothing overflows. That needs the max first,
   another pass.
6. Online softmax as a scene: cards dealt one at a time, a sticky note with the biggest so far and
   a running sum. New biggest: shrink the old sum by one factor, then add. Exact, not approximate.
   Two sticky notes can be merged, so tiles can be processed independently.
7. The output rides along on the same note. FlashAttention: each program loads its queries once,
   streams key and value tiles through, keeps its note, writes the output once. Nothing table-sized
   ever leaves the chip. It becomes compute-bound.
8. Backward pass: recompute instead of remember. More math, fewer bytes, and it's faster. Same trade
   as checkpointing.
9. Later versions keep the math units busy; Flash-Decoding splits the other way for one query row.
   Build insight: the tiled NumPy version on the Mac was slower, because tiling only pays when tiles
   stay on the chip. Triton named once. The rescale bug that hides when the max lands in the first
   tile. Ending.

## Numbers worth saying

Thirty-two thousand words: the table is bigger than the Spark's whole memory; with FlashAttention,
a few megabytes. About three times faster training at launch.

## Left to the written lesson

Byte counts and the arithmetic intensity derivation, the score matrix size calculation, the memory
ladder speeds and sizes, the worked online softmax table and induction proof, the merge formula,
tile loop pseudocode, the IO theorem, L2 effects, backward gradients and the D trick, FA two and
three specifics, Triton syntax and masks, benchmarking rules, all Build It, Measure tables, most
Break It items.
