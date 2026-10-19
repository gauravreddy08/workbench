# Outline: lora

Source: src/lessons/lora.mdx. Curriculum: "Fine-tuning and LoRA."

## The one big idea

The change fine-tuning makes to a big model is usually a small, simple edit: a push in only a few
directions. So freeze the model and learn just the edit, as two thin matrices whose product is the
change. That's why it fits on one machine, saves as a tiny file and merges back in for free, and
it's also exactly why it's great at teaching a format and bad at teaching a pile of new knowledge.

## Opening scene

He wants an 8B to return a strict relevance judgement in JSON for his ranking work. It's right
most of the time, and about one time in twenty it opens with "Sure! Here's my assessment," and the
parser falls over at three in the morning on the batch that mattered.

## Wrong mental model B voices

"Fine-tuning means retraining the model." Later: "it trains half a percent of the weights, so a
step must be a couple of hundred times faster" (lesson's Predict), and "so I can teach it all our
internal docs this way".

## Story beats

1. The JSON judge and the one-in-twenty failure.
2. Full fine-tuning doesn't fit: the training-memory bill (re-explained in a sentence) is the whole
   Spark. And every task would be another full copy.
3. The strange thing: the edit is tiny. Origin: GPT-3 copies per customer were absurd; adapters
   added latency, prefix tuning ate context; Hu and colleagues learn the change as two thin
   matrices; a task checkpoint drops from hundreds of gigabytes to tens of megabytes.
4. Low rank in words: squeeze the input down to a few numbers, spread it back out; the update can
   only push in that many directions. Savings grow as the model gets wider.
5. Why that's enough: intrinsic dimension; a couple of hundred numbers, randomly spread across all
   weights, got most of the way on a paraphrase task; bigger pretrained models need fewer.
6. B starts at zero: step zero is exactly the base model. Not both zero, because each one's
   gradient is multiplied by the other.
7. Not a couple of hundred times faster: the forward and backward still go through every frozen
   layer. The wins are memory and storage.
8. Merge for zero cost, or keep adapters separate and serve many on one base.
9. QLoRA: the frozen base in four bits, levels placed where the weights are; slower steps; on the
   Spark a choice until seventy billion. Don't merge into the four-bit weights.
10. Learns less, forgets less: format and style versus a domain's worth of facts. When I ran the
    toy on my Mac, the base model already had the content and only the format was wrong.
11. Token bugs and honest evals: chat template, loss mask, compare against base plus best prompt,
    split by query, check what it forgot.

## Numbers said aloud

One time in twenty; about half a percent of the weights; a couple of hundred numbers (intrinsic
dimension); four bits.

## Left to the written lesson

The bytes table, parameter-count formulas and tables, the 41.9M count, the alpha over r scale and
rsLoRA, LoRA dropout, target module lists, FLOP ratios, adapter file sizes, Punica and S-LoRA
details, NF4 block sizes and double quantization arithmetic, paged optimizers, the Biderman
numbers, the hyperparameter table, overfitting signs, all Build It code, Measure tables, Break It
items, Explain It Back.
