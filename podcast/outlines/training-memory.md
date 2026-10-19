# Outline: training-memory

Source: src/lessons/training-memory.mdx. Curriculum: "Why training needs so much memory."

## The one big idea

Running a model needs only its weights. Teaching it needs a pile of notes about every weight (its
gradient, a full-precision backup, and Adam's two running averages) plus everything the forward pass
worked out, kept so backward can trace its mistakes. The notes are many times the weights, and every
memory trick is a way to keep fewer of them.

## Opening scene

Fine-tuning Llama 3.2 1B, a model that serves happily on a laptop, dies with out-of-memory on the
very first step on a 24 GB card. Drop the batch to one: it runs, then dies on step two. What does
step two need that step one didn't?

## Wrong mental model B voices

"The model is the weights, so training memory is the weights plus the batch of data." (Diagnostic:
memory math for models is fuzzy.) Later: "so CPU offload should help on the Spark", and "LoRA
freezes the model, so it shouldn't need activations".

## Story beats

1. The crash, and the stranger crash on step two.
2. Origin: 2019, the ZeRO team at Microsoft counts the bytes; GPT-2's biggest model is a fraction of a
   GPU's memory and still can't be trained on it.
3. The notes per weight: a gradient (same shape as the weights), Adam's two averages (which way has
   it been moving, how big are its pushes usually), kept in full precision. Step two mystery: Adam
   creates its notes lazily during the first update.
4. Why a second, full-precision copy: tiny updates round away in sixteen-bit and training silently
   stops learning. The backup copy lets small nudges add up.
5. The total: about sixteen bytes per weight against two for serving. Mixed precision doesn't shrink
   this; it shrinks the stash and saves time.
6. The stash: backward needs what each layer saw going forward; layer one's stash is written first
   and read last, so the peak is at the turn from forward to backward. Grows with batch and length;
   textbook attention keeps a square grid per head, fused attention doesn't.
7. Levers, each removing one bucket: recompute instead of store (costs about a third more compute),
   eight-bit optimizer notes, gradient accumulation (only the schedule changes), sharding across GPUs
   (back to ZeRO). CPU offload buys nothing on the Spark because it's one shared pool.
8. What fits: full fine-tune tops out around seven billion on the Spark; LoRA freezes the base so it
   pays only its two bytes, and with a four-bit base reaches seventy billion. Activations remain,
   because gradients flow back through frozen layers.

## Numbers said aloud

Sixteen bytes per weight; two for serving (eight times); about seven billion versus seventy
billion on the Spark (ten times).

## Left to the written lesson

Byte tables per recipe (AMP, pure bf16, Megatron), the activation formula and its constants, the
logits estimate, Korthikanti's counts, the GPT-2 saved-tensor measurements, ZeRO stage formulas,
Adafactor, the calculator, the bf16 spacing arithmetic, all Build It code, the snapshot tool,
max-batch search, Measure predictions, Break It items, Explain It Back.
