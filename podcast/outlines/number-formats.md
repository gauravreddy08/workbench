# Outline: number-formats

Source: src/lessons/number-formats.mdx. Curriculum: "fp32, bf16, fp16, fp8." How are decimal numbers
stored in bits, and why did everyone switch to bf16?

## The one big idea

A float is scientific notation in binary: some bits say how big the number is (range), some say how
many significant digits it keeps (precision), and precision is relative, not a count of decimal
places. Squeezed into sixteen bits, fp16 kept precision and gave up range; bf16 kept fp32's range
and gave up precision. Training dies of range failures (tiny gradients rounding to zero, big sums
becoming infinity), while rounding noise drowns in the noise gradient descent already has. So bf16
won, as long as precision is kept where it truly matters: the master weights, the optimizer, and
long sums.

## Opening scene

A fine-tuning script that works in thirty-two bits, flipped to fp16 to save memory. It trains for a
few hundred steps, then the loss prints "not a number" forever. Or sneakier: it just stops learning.
Flip it to bf16 instead: trains fine, no extra code. Same sixteen bits, same speed.

## Wrong mental model B voices

His diagnostic answer, nearly verbatim: "bf16 has smaller precision, like the points after the
decimal are less than fp16." A: half right. It is less precise. But "points after the decimal" is
the wrong picture (precision is relative), and the missing half, range, is why bf16 won.

## Story beats

1. The dying fine-tune, and the bf16 flip that just works.
2. History: before nineteen eighty-five every maker had its own floats; Kahan and IEEE seven fifty
   four. Then deep learning wanted narrower numbers: fp16 on Volta needed a trick; Google Brain cut
   a different sixteen-bit split for TPUs, bfloat sixteen; NVIDIA added it with the A100, and people
   switched.
3. Scientific notation: digits versus the exponent. Two different jobs: how big, how precise. A
   float is the same thing in base two. Sign, exponent, mantissa, named after the idea.
4. The two sixteen-bit splits. bf16 is literally the top half of an fp32. B's diagnostic answer and
   A's correction: precision is relative; bf16 can't tell two fifty-six from two fifty-seven, but is
   off by the same small fraction at any size.
5. The gaps grow with the number. Big plus small loses the small: a weight update vanishes. The long
   sum that stalls: a hundredth added a thousand times in bf16 gives four. Why hardware sums in fp32.
6. The edges: fp16 overflows past about sixty-five thousand to infinity, infinity becomes NaN, NaN is
   contagious through the optimizer and across GPUs. Softmax and the subtract-the-max trick (seed of
   FlashAttention). At the bottom: gradients are tiny and fp16 rounds them to zero.
7. Loss scaling: multiply the loss up so gradients rise out of the danger zone, divide back in fp32.
   The dynamic scaler skips steps and halves. It works but it's a moving part.
8. Why bf16 makes it simple: fp32's range, nothing to scale. It pays in precision, and mini-batch
   noise is far bigger than its rounding. Mixed precision: what stays in fp32 and why (master
   weights, sums, touchy ops, Adam's state). FP eight in a sentence: range is back to being managed.
9. Mac run insight: unshrunk, every format trained fine on a small model; shrink the loss and almost
   half of fp16's gradients were zero at the first step, and its loss ended worse than it started,
   while bf16 didn't notice. Ending: B restates, A sharpens.

## Numbers worth saying

About sixty-five thousand (fp16's ceiling). Two fifty-six plus one is two fifty-six in bf16. A
hundredth added a thousand times gives four. Almost half the gradients zero.

## Left to the written lesson

Bit layouts and field counts, biases, the decoding walk-through of minus two point five, the
formats table, epsilon values, tf32 details, fp8 maxima, subnormal thresholds, the gradient value
table, rounding rules and point one plus point two, catastrophic cancellation and variance, the
scaler's defaults, stochastic rounding, fp8 training recipes, all Build It code, Measure tables,
Break It runs.
