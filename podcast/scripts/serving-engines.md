<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture where you are by now. You've spent weeks on your own inference server. You wrote the KV cache. Then batching, so lots of people share each step. Then a prefix cache, so repeated system prompts are free. You quantized the weights, you bolted on a draft model. Every change got a row on the scoreboard, and you're honestly pretty proud of the sixteen-user row.

B: As you should be.

A: And then you pull a container, type one command, vLLM serve, and point the exact same harness at it. And at one user, it's a bit faster than your best. At lots of users, it's a lot faster. And the worst-case wait for the first word is a fraction of yours.

B: [laughs] That's deflating.

A: It's a little deflating. But nothing you did was wrong. It just does all of it at once, plus a few things you didn't think of, and none of it with Python sitting in the hot path. And honestly, that's the best possible moment to open its code. Most people meet vLLM as a black box with a couple of hundred flags. You get to meet it as, oh, that's my batching loop, but in its own process. That's my prefix cache, but in blocks.

B: Okay, but it's a few hundred thousand lines. Where do you even start?

A: Same three moves for any big systems codebase. Find the loop. Find the main data structure. And follow one request all the way through. That's it. Everything else hangs off those.

<!-- section: How we got here -->

A: [warm] It helps to know why it looks the way it does. Back in twenty twenty-two, serving a model mostly meant what your first server did. A batch goes in, and the whole batch comes out when its slowest member finishes. Then a paper called Orca said, why not schedule every single step? One word at a time. Finished requests leave, new ones join, mid-flight.

B: That's continuous batching.

A: That's continuous batching. Then in twenty twenty-three, vLLM comes out of Berkeley with the paging idea, KV memory in small blocks instead of big reserved slabs, so way more requests fit. Then SGLang, which keeps finished requests' notes in a tree so later prompts can reuse them. And then something funny happened. GPUs got so fast that the bottleneck moved. It wasn't the GPU any more. It was the CPU. Python deciding what to run, preparing inputs, telling the GPU what to do next.

B: The GPU was waiting on Python.

A: Waiting on Python. And so in early twenty twenty-five the vLLM team rebuilt the core around exactly that problem. That rebuild is the shape you're looking at now. And if there's one sentence for the whole engine, it's this: the GPU must never wait for Python.

<!-- section: Three programs and a loop -->

A: So, the first thing you notice. Your server was one process. One FastAPI app, one model, a lock, everything in one place. vLLM splits it into separate running programs that send each other messages.

B: Which ones?

A: There's a front door that speaks HTTP and text. It checks the request, applies the chat template, turns your text into tokens, and on the way back, turns tokens into text and streams them out. Then there's the engine core, which is a loop that never stops. Every trip round it decides who runs, hands that to the GPU, and collects the results. And then there's the GPU worker, which holds the weights and actually runs the model.

B: [skeptical] Why separate processes though? Threads could share memory for free. Now you're packing everything up and shipping it over sockets.

A: You'd think threads would be cheaper, right? But think about the GIL. In Python, only one thread can run Python code at a time. So if turning tokens into text ran on a thread inside the engine, every moment it spent doing that is a moment the loop isn't deciding the next step. And while the loop isn't deciding, the GPU sits there with nothing to do.

B: Oh. And with lots of users, there's a lot of that text work.

A: It grows with every user. One user, it's nothing. Sixty-four users, it's sixty-four lots of decoding text and writing chunks, every step. In separate processes, those run truly in parallel on other cores. The front door can be turning this step's tokens into text while the engine core is already planning the next step. The messages cost a little, but that's tiny next to an idle GPU.

<!-- section: One step -->

A: Now the loop itself. Your batching loop probably had two kinds of steps. If someone new is waiting, read their prompt. Otherwise, everyone writes one word.

B: Yeah, prefill phase, decode phase.

A: vLLM doesn't have phases. It has a budget. Every step there's a maximum number of tokens it'll process in one pass, and the scheduler hands them out. Everyone who's already writing gets their one word first, because starving them would make their streams stutter. Then whatever's left goes to people waiting, oldest first. And if someone's prompt is longer than what's left, they get part of it now and the rest in later steps. That's called chunked prefill.

B: So one pass through the model can have half of someone's prompt plus one word for fifteen other people.

A: Exactly that mix. And here's why it's smart. Remember why writing is slow. Each step hauls the whole model across from memory and barely uses the chip's math. And reading a prompt is the opposite, lots of math per byte. So if you mix them, the prompt reading uses the math that the writing was wasting, inside the same trip through the weights.

B: [working it out] And my two-phase loop hauled the model across twice. Once for the prompt, once for everyone's word.

A: Paid for the trip twice. And the other thing you notice when you follow one request through: the GPU never sees a request at all. It sees a pile of token positions and a table saying where each one's notes live in memory. The whole idea of "a request" only exists up in the scheduler.

<!-- section: When memory runs out -->

B: And the memory side is the paging thing you built.

A: The same blocks, the same fingerprints for prefix caching. What's new is what happens when it runs out. Someone needs another block, and there isn't one. So the scheduler picks a victim. By default it's the newest arrival, and it has to give up its memory.

B: Give it up how? It's in the middle of answering.

A: Two options. You can copy its notes out to CPU memory and copy them back later. That's called swap. Or you can just throw them away, put the request back in the queue, and when it comes back, read its prompt and everything it's written so far all over again. That's recompute.

B: Recompute sounds wasteful.

A: It sounds wasteful, but reading text is the fast part of inference. And with prefix caching on, the victim's blocks often haven't been reused by the time it comes back, so a lot of the recompute is actually a cache hit. And on the Spark there's a twist. The CPU and the GPU share one pool of memory. It's the same chips.

B: Oh. So swapping to CPU memory would just copy bytes from one part of the memory to another part of the same memory.

A: Using the exact bandwidth that writing words needs, and freeing nothing you couldn't have just given to the cache in the first place. So on the Spark the right move is a bigger pool and let recompute handle the rare overflow. And every preemption is a stall in someone's stream, which is why the preemption count is one of the first things people check when the worst-case latency goes bad.

<!-- section: Getting the CPU out of the way -->

A: Here's the part that surprises people. Even after you batched everything, what did your server do for every single word? Python decided what to run. Built input tensors from Python lists. Copied them over. And then told the GPU to run every little piece of every layer, one at a time.

B: Like, every norm, every matrix multiply, separately.

A: Every one. A forward pass is hundreds of these little launches, and each one costs the CPU a few microseconds. So the engines use something called CUDA graphs. You record the whole sequence of launches once, and then replay all of them with a single call. The catch is the shapes have to stay the same, so vLLM records one graph for each batch size it expects, and pads real batches up to the nearest one. That's what all that "capturing CUDA graphs" stuff in the startup log is.

B: So that's where the speed comes from.

A: On a big data-center GPU, a lot of it does. But here's the thing about your Spark. Its memory is slow, so each step is long. The same launch overhead that's a few percent of a Spark step is close to half of a step on a fast data-center GPU, because those steps are so short. These engines were built for the fast GPUs. So you should expect their advantage at one user on your Spark to be smaller than the hype.

B: [skeptical] Okay, but I'd still have guessed most of vLLM's edge was faster kernels. Better code down at the bottom. C plus plus instead of Python.

A: That's the thing I'd push back on. Kernels matter. But try this. vLLM has a setting that limits it to one request at a time. Turn that on, and send it sixteen users. It queues. Exactly the staircase your first naive server made, each person waiting for everyone ahead of them. Each one's served faster, but they still wait in line.

B: Huh. So the fast stack doesn't save you if you take away the scheduler.

A: Everything that makes it good at serving lots of people is the scheduler. And at one user on the Spark, you're still stuck under the same ceiling as before, about seventeen words a second, because that's the memory talking. A good engine gets close to it. So does a good hand-built server. There just isn't much left to win there.

<!-- section: Same skeleton, different bets -->

B: So where does SGLang differ? It sounds like the same thing.

A: Same skeleton. A front door, a scheduler loop, a model runner, blocks of memory. The differences are what it treats as the main problem. Its prefix cache is a tree of everything it's computed, so a new prompt just walks down the tree as far as it matches. And because it can see the tree, it can see which waiting requests share long prefixes, and run those first, before the shared parts get evicted.

B: Which sounds great for throughput and not so great if your prompt is the weird one.

A: That's the trade. The odd prompt can wait longer. And the other thing it pushed hard on is structured output. You ask a model for JSON, and it'll usually comply. "Usually" is a problem when there's a parser on the other end. So at every step, the engine works out which tokens would break the format, and sets their chance to zero. The model literally can't write invalid JSON. Both engines do this now.

B: And the others? I hear TensorRT and llama.cpp a lot.

A: TensorRT-LLM is NVIDIA's own. Its edge is kernels, because NVIDIA writes the fast paths for its own new hardware first. And llama.cpp is a different animal. Plain C and C++, built for one or a few users on whatever machine you have, laptops included, with very aggressive four-bit formats. Great at one user. Serving lots of people at once just isn't its goal.

<!-- section: Past one GPU -->

B: What happens when the model doesn't fit on one GPU?

A: Inside one server, you split every layer across the GPUs. Each one holds a slice of every weight matrix, computes its part, and then they add their partial answers together. That's tensor parallelism. And it helps writing speed too, because each GPU only hauls its slice of the weights per word.

B: But they have to talk every layer.

A: Twice per layer. Inside a server the GPUs are wired together with very fast links, so it's nearly free. But if you linked two Sparks over their network ports, every one of those little conversations is a network round trip, and there are dozens of them per word. So linking Sparks is mostly about fitting a model that doesn't fit in one, not about making a small one faster.

B: And the frontier stuff?

A: The frontier is splitting the two halves apart. Reading prompts and writing answers want different things. Reading wants math, writing wants memory speed. And when they share a GPU, every chunk of someone's long prompt makes the step a bit longer for everyone who's mid-answer. You see a little stutter. So the biggest setups run them on separate machines. One pool reads prompts, then ships the notes over to another pool that only ever writes.

B: And shipping the notes isn't free.

A: That's the price. For a long prompt it's a lot of bytes to move before the first word, so it needs very fast networking. You won't run it on one Spark. But it's the current answer to "the wait for the first word and the smoothness of the typing are fighting each other, what do you do at scale?"

<!-- section: Ending -->

B: Okay, let me try it. vLLM is basically my server, all the same pieces, but split into separate processes so the GIL can't stall it, with a scheduler that mixes prompt reading into everyone's writing steps, memory in blocks, and CUDA graphs to cut out the launch overhead. And it's faster mainly because of better kernels.

A: All of that's right except the last bit. The kernels help, and on a fast GPU killing the launch overhead matters a lot. But on the Spark at one user, it's still the memory setting the speed, and there's little left to win. Where it really pulls ahead is lots of users, and that's the scheduler. Every step, deciding who gets how many tokens, keeping the GPU fed, never letting Python make it wait. Take the scheduler away and it queues just like your first server did.
