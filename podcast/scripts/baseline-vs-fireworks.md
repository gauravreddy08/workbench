<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've done the division. Model size against memory speed, and you've predicted your Spark will write with Llama at about seventeen tokens a second, tops. Hold onto that number. Now open Fireworks' playground, pick the same size of Llama, and ask it for a short story.

B: And it just pours out.

A: It pours out. Faster than you can read. Do the same on your Spark and it comes out at roughly the speed you'd read aloud. So, Fireworks is faster.

B: I mean, obviously. They've got a data center. I've got a box on my desk.

A: Obviously. Except. Run both from the Spark itself, with a short prompt, and just watch the very first word. Your Spark can show it before Fireworks does. Because your request never left the box. And then it falls behind on every word after that.

B: Huh. Okay, so it wins the start and loses the race.

A: And then it gets stranger. Have three friends hit your Spark at the same moment, and the third one stares at a blank screen for most of a minute. Meanwhile Fireworks is serving thousands of strangers without blinking. So "which one is faster" doesn't have an answer yet. Faster at what? For how many people? Measured how?

<!-- section: The weights got out -->

A: [warm] And the reason there even is a company like Fireworks is kind of a fun story. Early twenty twenty-three, Meta releases its Llama model to researchers. And within about a week, the weights are all over the internet. A few months later, the next Llama comes out with a license that lets companies use it commercially. And then a whole wave of open models follows.

B: So suddenly anyone can download something close to the best models.

A: Anyone. But downloading a model is easy. Serving it well is not. GPUs are expensive. And a GPU answering one person spends most of its time waiting on memory, while all that compute just sits there. So a bunch of companies built a business in that gap. Run big fleets of data-center GPUs, serve the open models to lots of customers at once, and sell the output by the token.

B: And the margin comes from what, just having nicer GPUs?

A: Partly. But mostly from tricks. Serving lots of people with each read of the weights. Skipping work they've already done. Moving fewer bytes. Guessing a few words at once. And every one of those is something you get to build later. So the server you build today has none of them, on purpose. It's the before picture.

<!-- section: What fast even means -->

A: So the first job is to say what "fast" means. And I like thinking about it as a restaurant. How long until the first plate lands? How steady is the pace after that? How long is the whole meal? And how many diners can the kitchen feed in an hour?

B: [working it out] The diner cares about the first three. The owner cares about the last one.

A: That's it. The first one, for a model, is the time to first token. The wait before anything shows up. That's what makes a chat app feel responsive. Then the pace once words are flowing, how long between each one. Then the whole answer. And then the owner's number, how much text the whole server is producing across everybody at once, which is called throughput. That's what an inference company actually sells.

B: And for each of those I'd want the typical case and the bad case.

A: Right. The typical request, and the unlucky one in a hundred, the p ninety-nine. You know why that matters. At any real scale, someone is always the unlucky one.

<!-- section: Following one request -->

A: Now, to see why the Spark wins the start and loses the race, follow one request all the way. First it has to travel to the server. On your own machine, that's basically free. Over the internet to Fireworks, it's a real trip, plus their front door, plus a scheduler deciding where you go.

B: Then it waits, maybe.

A: Then it might wait in a queue. Hold that thought, because it's the biggest thing in this whole story. Then the model reads your whole prompt. All the words go through together in one pass, so that part is limited by how much math the chip can do. That's called prefill, and it also makes the first word. And then the model writes the answer one word at a time, and every single word means reading all the weights out of memory again. That's decode.

B: Right, that's the seventeen. The memory speed thing.

A: That's the seventeen. So now you can see it. The first word is mostly fixed costs. The trip, the queue, reading a short prompt. Your Spark is right there and nobody's ahead of you, so it can win. But every word after that is a pass over the weights, and that's where Fireworks is roughly ten times quicker per word. The trip over the internet you pay once. The per-word speed you pay for every word.

B: [working it out] So a short answer favours the box next to me, and a long answer favours the fast GPU.

A: That's the shape. And make the prompt long, and Fireworks starts winning the first word too. Because reading a long prompt is heavy math, and their GPUs have far more of it. So they make up for the internet trip.

B: Why are they so much faster per word, though? It's the same model. It's just reading weights.

A: Everything in that division is different for them. Their GPUs have memory stacked right next to the chip, way faster than the Spark's. They might store the weights in fewer bits, so there's less to read. They might use a small model to guess a few words ahead and check them all at once. And their code is compiled, tuned GPU code, not a Python loop. They don't tell you which of those they're doing, and that's fine. You'll build each one and see what it's worth.

<!-- section: Sixteen people at once -->

A: Okay, here's the part that surprises people. Sixteen people send a request to your simple Spark server at the same instant. The server handles exactly one request at a time. What happens?

B: [a bit unsure] Honestly my gut says it falls over. Like, it's overloaded, something crashes.

A: That's the picture a lot of people have, and it's not what happens. Nothing crashes. It just queues. The first person gets served. The second waits for the first to finish completely. The sixteenth waits for fifteen whole answers before theirs even starts. Each answer takes a while at reading-aloud speed, so that last person is waiting minutes for their first word.

B: Okay. But at least the server's working harder, right? Sixteen people, more getting done.

A: That's the part that really gets me. No. The total amount of text coming out of the server is exactly the same as with one user. One answer at a time, at the same speed. Adding people added nothing except waiting.

B: Huh. So it's just a longer line.

A: It's just a longer line. And there's a neat rule behind it, from the waiting-in-line stuff. The number of people in the system is the rate the server finishes them, times how long each one spends inside. So if the rate is fixed and you double the people, you double the wait. It's called Little's Law. Double the users, double the wait, and throughput never moves.

B: And Fireworks doesn't have that problem.

A: Because Fireworks doesn't serve one request at a time. It does one pass over the weights for a whole batch of people together. And remember, the expensive part of each pass is reading the weights, and the chip was mostly idle anyway. So adding more people to that pass barely makes it slower. That's why their slow-case latency hardly moves as you turn up the number of users. And it's exactly the trick your server gets next.

<!-- section: Measuring it honestly -->

A: So now you want to measure all this for real. And a benchmark is only as good as its boring parts. A few of them bite.

B: Like what?

A: Like this one. The server streams text back in little events. And it's really tempting to count each event as one word and time the gaps. But an event can carry several tokens. Your own server will hold text back until it has a whole word. A busy API might flush a few at once after a hiccup. So you count tokens from what the server reports at the end, and you time from the first word to the last.

B: Okay, that's fair.

A: And another one. Say you send twenty requests and want the p ninety-nine. Where is it? With twenty requests, the p ninety-nine is basically just your single worst request. One unlucky pause and that's your headline number. To trust a percentile you want a decent number of samples past it, which for the p ninety-nine means a lot of requests. On a slow server that's hours.

B: [skeptical] So what do you do, just run it all night?

A: Sometimes, yes. Or you're honest instead of heroic. You report how many samples you had next to every number, and you don't print a p ninety-nine that's really a max. And then the fairness stuff. Same model on both. Same prompts in the same order. Force every answer to be the same length, so a chatty answer and a curt one don't get compared. Throw away the first few requests, because they pay for warming everything up.

B: And errors?

A: Errors are data. That one's my favourite trap. Your client has a default timeout. A request stuck in line behind fifteen others doesn't get a byte for minutes, so it times out. And if your harness quietly drops failures, your p ninety-nine suddenly looks great. The slowest requests just vanished from the data. A timeout is really a decision about which requests you're willing to not measure. Make it on purpose, and count what fails.

<!-- section: The scoreboard -->

A: And all of that goes into one file. A scoreboard. Each row is a change and what it did to the numbers. Fireworks is the reference row. Your simple server is the baseline. And every lesson after this adds a row.

B: So it's like a to-do list, but each item is a gap.

A: Kind of. Every gap has a cause, and every cause has something that fixes it. Throughput flat as users grow, and the line that grows with them, that's batching. Too many bytes per word, that's storing the weights smaller. One word per pass, that's guessing ahead. And here's one you'll see straight away. The simple server usually lands noticeably below the seventeen you predicted. And the missing part isn't memory. It's Python, running the loop, launching hundreds of tiny jobs on the GPU for every word and waiting between them. The GPU sits idle for slivers of every step.

B: So even the ceiling I worked out, I'm not reaching it.

A: Not with naive code. Which is the point of building the naive one first. When you later read the code of a real serving engine, you'll know exactly what problem each piece solves, because you measured that problem yourself.

<!-- section: Ending -->

B: Okay, let me try. "Faster" isn't one thing. The first word is about the trip and the queue and reading the prompt, so my Spark can win that when I'm right next to it. Every word after is about reading the weights, and Fireworks wins that by a lot. And with lots of users, my server just slows down for everybody, while theirs batches.

A: Nearly. The one thing I'd change is "slows down for everybody". Your server doesn't get slower. Each answer comes out at the same speed it always did. What grows is the line in front of it. The wait before the first word goes up with every person ahead of you, and the total output stays flat. That's the row on the scoreboard that looks the worst, and it's the first one you get to fix.
