# Outline: quantization

Source: src/lessons/quantization.mdx. Curriculum: "Quantization." What do you lose when you store
weights in 8 or 4 bits, and what do you gain?

## The one big idea

Storing weights in fewer bits is rounding them onto a coarse ruler, and the bit count is not what
decides quality. What decides it is how many weights share one ruler: a single giant value
stretches the marks for everyone who shares it. And what you gain depends on what got smaller:
shrinking only the stored weights speeds up writing the answer, not reading the prompt.

## Opening scene

The Spark's speed ceiling from the bandwidth episode (about seventeen words a second, set by
hauling the model across memory). The obvious move: store each weight in four bits instead of
sixteen. The naive quantizer on a small Qwen: the model didn't get a bit worse, it was gone. Change
one thing, same four bits, and it's fine.

## Wrong mental models B voices

1. "Four bits is four bits; fewer bits just means a bit less accurate everywhere." A: same bit count,
   results from unchanged to destroyed.
2. "So the math happens in four bits and everything is four times faster." (Bandwidth outline noted
   B's "is the math four-bit?".) A: weight-only formats unpack back to sixteen-bit before the math;
   it's purely fewer bytes crossing the pipe, so decode speeds up and prompt reading doesn't.

## Story beats

1. The ceiling, and the cheap way past it: fewer bytes per weight.
2. The disaster: one ruler for a whole matrix, the model collapses. Perplexity explained in a
   sentence. Then per-group rulers, same bits, model fine.
3. The ruler: fewer marks, snap to the nearest, worst error half a step. Each bit halves the step.
   Scale and zero-point, named.
4. Why it collapsed: one outlier sets the ruler, almost everything else rounds to zero. Fix: fewer
   weights per ruler (per row, per group of a hundred and twenty-eight). The cost: storing rulers,
   which is why four-bit files are never exactly a quarter.
5. History: phones and the Google scale-and-zero-point scheme; then giant models in twenty
   twenty-two; Dettmers finds outlier features in activations, a few channels enormous on almost
   every token, used on purpose. LLM.int8 and SmoothQuant, briefly.
6. B's wrong model about the math. Weight-only versus weights-and-activations; decode wants fewer
   bytes, prefill wants cheaper math; why local setups love four-bit and big fleets love FP eight.
7. Rounding smarter: GPTQ lets neighbours compensate; AWQ notices about one weight in a hundred
   matters most, found by looking at activations.
8. What you lose and how to tell: perplexity is blunt; flips (same score, different answers); small
   models suffer more; multi-step math and long context break first. Kernel matters: a careless
   unpack is slower than not quantizing.
9. Spark surprise: four-bit gave a few times the speed, not a clean four, because fixed costs grow
   as a share. Ending: B restates, A sharpens.

## Numbers worth saying

About seventeen and something near fifty-five (the ceiling before and after four bits). The
perplexity going from about fourteen to tens of millions. One weight in a hundred (AWQ). "Half a
step" as the worst error.

## Left to the written lesson

Formulas for scale and zero-point, the RMS error, the outlier fraction calculation, granularity error
table, perplexity tables, activation outlier channel numbers, FP eight and FP four bit layouts,
MXFP four versus NVFP four details, GGUF k-quant layouts and bits per weight, Marlin, GB ten compute
capability, all Build It tasks, the Spark prediction table, Break It items.
