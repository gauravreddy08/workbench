<!-- section: The Problem -->

A: [relaxed, thinking out loud] So here's a job from your ranking work. Your cross-encoder ranks documents fine. But you want something it can't do. A model that reads a query and a page, and hands back a strict little judgement in JSON. A label from zero to three, and one sentence of reason. For labelling training data, or as a second check on the ranker.

B: And I'd just prompt Llama for that. The eight billion instruct one.

A: You would, and it's right most of the time. And then, about one time in twenty, it opens with "Sure! Here's my assessment:". Or it forgets a field. Or it invents a label four on a zero to three scale. And your parser falls over, at three in the morning, on the one batch that mattered.

B: [laughs] Yeah, I've lived that.

A: So the obvious fix is to train it a bit more, on a few thousand examples of exactly the output you want. That's fine-tuning. Take a model that already knows a lot, and train it a little more so it gets good at one job.

B: Right, so I retrain the model on my examples. On the Spark, overnight or whatever.

A: That's the picture. Retrain the model. And then you do the memory math, and it falls apart. Remember what training costs. Every weight drags along its gradient, a full-precision backup copy, and Adam's two running averages. It comes to about sixteen bytes per weight, against two just to run it. For an eight billion model, that's the Spark's entire memory. Before you've stored a single thing about the data.

B: So it doesn't fit.

A: Doesn't fit. Not "fits badly". And suppose it did. Every task you fine-tune for gives you a whole new copy of the model. A relevance judge, an extractor, a query rewriter. Three full copies on disk, and three full models in memory if you want to serve them all.

B: Okay. So what's the way out?

A: The way out starts with something strange. The change fine-tuning actually makes to the weights turns out to be tiny and simple. You're paying to update eight billion numbers, when the change you need could often be written down with a few million.

<!-- section: Learn the change, not the model -->

A: [warm] And the people who hit this hardest were the ones with the biggest model. By twenty twenty, the recipe was: pretrain one big model, fine-tune a copy for each task. And that breaks completely at GPT three's size. A fine-tuned copy per customer, of a model that size, is absurd to store, let alone train.

B: There were cheaper tricks already, weren't there? Adapters?

A: There were. Adapters slipped small new layers in between the existing ones. But those layers sit in the path of every token, so they slow down every single answer. Another idea, prefix tuning, learned a handful of fake tokens to stick in front of the input. But those eat into your context window, and they were finicky to train. And then in twenty twenty-one, Edward Hu and his colleagues at Microsoft proposed something simpler. Leave every weight frozen. Don't learn the new model. Learn the change to each weight matrix. And write that change as the product of two thin matrices.

B: Two thin matrices.

A: Two thin matrices. On GPT three, it cut the trainable numbers by a factor of about ten thousand, and it shrank a task's saved file from hundreds of gigabytes down to tens of megabytes. And it matched full fine-tuning on their benchmarks. They called it LoRA, low-rank adaptation. And the property that made it win is this. At the end, you can multiply the two thin matrices out and just add them into the original weight. So when you're serving it, there's nothing extra. Same model shape, same speed.

<!-- section: A squeeze and a spread -->

B: Okay, so walk me through the two thin matrices. What do they actually do?

A: So picture one of the big weight grids in a layer. It takes in a vector a few thousand numbers long, and puts out another one. Fine-tuning would nudge every single entry in that grid. LoRA leaves the grid alone and adds a little side path next to it. The input goes into the first thin matrix, which squeezes it down to just a handful of numbers. Say sixteen. Then the second thin matrix spreads those sixteen numbers back out to full size. And that gets added to what the big grid produced.

B: [working it out] So whatever the update does, it has to fit through sixteen numbers.

A: It has to fit through that bottleneck. Which means the update can only push the output in sixteen independent directions. That's what the rank of a matrix means, how many independent directions it can push in. A full grid can push in thousands. The squeeze-and-spread can push in sixteen. That's why it's called a low-rank update.

B: And the savings come from the two thin matrices being way smaller than the grid.

A: Way smaller. And the savings get better as the model gets wider. Because the grid grows with width times width, and the thin matrices only grow with width. Put LoRA on every big grid in an eight billion model at a rank of sixteen, and you're training about half a percent of the model.

B: [skeptical] But that's a bet, right? You're betting the change you need only has a few directions in it.

A: It's exactly a bet. And it pays off more often than you'd guess, for a reason that came out a year earlier.

<!-- section: Why so few directions are enough -->

A: In twenty twenty, Armen Aghajanyan and colleagues asked a really clean question. How many free numbers do you actually need to fine-tune a pretrained model? So they froze the model, and picked a fixed random way to spread a small vector of numbers across all the weights. Then they trained only that small vector. And asked, how small can it get and still reach most of full fine-tuning's quality?

B: And?

A: For one model on a paraphrase task, about two hundred numbers. Two hundred, spread randomly across hundreds of millions of weights, got most of the way there. They called that the intrinsic dimension of the task. And here's the part I find beautiful. Bigger, better-pretrained models needed fewer. Pretraining makes the model so ready for language tasks that adapting it is a short walk in a few directions.

B: So LoRA is that same idea, but with a structure you can actually train well and fold back in.

A: That's it. Instead of a random spread, a structured one. One squeeze and spread per matrix.

<!-- section: Starting from zero -->

A: There's one small design choice that I think is lovely. The second thin matrix, the one that spreads back out, starts at all zeros.

B: So the side path adds nothing at first.

A: Adds exactly nothing. So at step zero, the model is the base model. With all its abilities. Training starts from a known good point and only moves as far as your data pushes it.

B: Why not start both at zero, then? Seems cleaner.

A: Because then nothing would ever train. Each matrix's gradient gets multiplied by the other one. If both are zero, both gradients are zero, forever. So one has to start random, so the other gets a signal. And when you check it, at the very first step, the first matrix's gradient is exactly zero, and the second one's isn't. Which is the system telling you it's set up right.

<!-- section: Not two hundred times faster -->

B: Okay so if I'm training half a percent of the weights, a training step should be, what, a couple of hundred times faster?

A: That's the guess everybody makes, and it's the one that surprises people. It's more like two thirds of the time. Sometimes barely less than full fine-tuning.

B: [skeptical] How? You're barely training anything.

A: You're barely updating anything. But think about what a training step does. The forward pass still runs through every frozen weight. And the backward pass still has to go back through every frozen layer, because the adapters in layer one need the gradient that flows all the way back from the last layer. The only thing you skip is working out the gradient for the frozen weights themselves. That's about a third of the work.

B: So the win isn't speed.

A: The win is memory and storage. The frozen weights need no gradients, no backup copy, no Adam averages. They just sit there at their two bytes, like they would for serving. Only the tiny adapters pay the full price. So on the Spark, the eight billion model goes from not fitting at all to fitting with tons of room. And the saved adapter is a file small enough to email.

<!-- section: Merge one, or serve many -->

A: And then you've got a choice at serving time. Merge the adapter into the weights once, and you've got an ordinary model. Nothing extra on the path. Zero added latency, because there's nothing left to add. Or don't merge, and keep it separate.

B: Why would I keep it separate if merging is free?

A: Because then the big base is shared. One copy of the base model in memory, and a pool of tiny adapters next to it, and each request picks which adapter it wants. The hard part is a batch where one row wants the relevance judge and the next row wants the extractor. Systems like S-LoRA and Punica wrote special kernels for that, and vLLM supports it directly. It costs you a little speed, since the side path runs on every token. That's the price of flexibility.

<!-- section: Four bits -->

B: And QLoRA is this plus quantization?

A: It's the next obvious step. LoRA got rid of the gradients and optimizer notes for the frozen weights. But the frozen weights themselves are still two bytes each. And Tim Dettmers and his colleagues asked, well, the base is frozen. Why store it in sixteen bits at all? So they stored it in four bits. With a twist. A four-bit format only has sixteen levels, and the question is where you put them. Pretrained weights are roughly bell-shaped around zero. So they put the levels where the weights actually are. Packed close together near zero, sparse out in the tails. That's called NF four.

B: And the math still happens in sixteen-bit?

A: Each chunk of weights gets unpacked to sixteen-bit right before it's used, and the adapters train in sixteen-bit the whole time. Gradients flow through the four-bit weights to reach earlier layers, but never change them. The cost is that unpacking, on every forward and every backward. So it's slower per step. On the Spark, plain LoRA on an eight billion model fits easily. Four bits is a choice, right up until you want to try a seventy billion one.

B: Can I merge a QLoRA adapter the same way?

A: Here's the trap. If you merge it into the four-bit weights, the result has to be rounded back to four bits, and your tiny update is small next to the gaps between those levels. Most of it just rounds away. So you load the base in sixteen-bit, merge into that, and then you test the merged model, not the training checkpoint. Because it's very slightly different from what you trained.

<!-- section: Learns less, forgets less -->

B: [working it out] Okay, so if this works so well... can I just LoRA our internal docs into it? All our APIs, the whole knowledge base?

A: That's the honest part, and it decides when to reach for LoRA at all. In twenty twenty-four, a team from Columbia and Databricks ran the careful comparison. They titled it "LoRA Learns Less and Forgets Less". And that's exactly what they found. When they had the model absorb a whole new domain, like billions of tokens of code, LoRA fell well behind full fine-tuning. When they looked at the change full fine-tuning actually made there, it had way more directions than a typical adapter can hold. A domain's worth of new facts isn't a small edit.

B: And the "forgets less"?

A: On the stuff the base model could already do, general knowledge, common sense, LoRA kept more of it than full fine-tuning did. A small edit breaks less. So a new output format, a style, one narrow labelling task: few directions, and LoRA is close to full fine-tuning. Everything about your company's internal APIs: many directions, and LoRA leaves a lot out. For knowledge, putting the facts in the prompt usually beats fine-tuning anyway. And I saw the format side of that really clearly with a toy on my Mac. A tiny model, and the task was pulling a name, age and city out of a sentence as JSON. Before training, it got zero exact matches. But when I read its outputs, it had the name, the age and the city right. It was just spreading the JSON over several lines. The content was already in there. What LoRA taught it was the format. And even the version that only adapted two of the projections got there.

B: So my relevance judge is exactly the good case. The model already knows what relevant means. It just needs to stop saying "Sure!".

A: For the format part, yes. The judgement itself improves less dramatically than the parse rate. Format is a few directions. Judgement's harder.

<!-- section: The bugs are in the tokens -->

A: And the most common fine-tuning bugs aren't in the math at all. They're in the tokens. First, an instruct model was trained to see conversations wrapped in its own special marker tokens. That's the chat template. If you train on plain "query, answer" text and then serve through the chat endpoint, the model sees a format at serving time it never saw in training. Nothing's wrong with the weights. It just isn't the input it learned to respond to.

B: And the loss mask, right? Don't train it to predict my prompt.

A: Right. Your prompt might be hundreds of tokens of query and page, and the answer a dozen. Train on every token and almost all the gradient goes into teaching the model to predict your prompts. So you only put loss on the answer. But keep the end-of-turn token in there, or the model gets the JSON right and then just keeps going.

B: And then how do I know it actually worked?

A: Two halves. Did it learn the task, on held-out examples, with the metric you care about? And compare against the base model with your best prompt, because if prompting already gets you most of the way, the fine-tune might not be worth owning. For ranking data, split by query, not by row, or the model learns the queries and your score lies. Then the other half. Did it break anything else? Ask it what the capital of France is. If it answers with a relevance label, you've found out what it forgot.

<!-- section: Ending -->

B: Okay, let me say it back. Fine-tuning the whole model doesn't fit, because every trained weight drags along a pile of training notes. But the change you need is usually small, just a few directions. So you freeze everything and learn only the change, as a squeeze down to a few numbers and a spread back out. Only that tiny piece pays for training. And you can fold it back in at the end, so it runs at full speed.

A: That's it. The piece I'd sharpen is that "a few directions" isn't just the reason it's cheap. It's also the limit. The same bottleneck that makes it fit on your Spark is the one that stops it from swallowing a whole new domain. So the question before you reach for it isn't "is this model too big to train". It's "is the change I want a small edit, or a lot of new knowledge?" A format, a style, a narrow judgement, it's the right tool. A pile of new facts, and it's the wrong one.
