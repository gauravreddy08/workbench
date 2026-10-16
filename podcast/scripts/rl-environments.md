<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you want a model to get better at fixing bugs. You've got the model. You've got a training algorithm, P P O, G R P O, whatever you like. And then you look around and realise you don't have anything for the model to practise on.

B: I mean... I've got bugs. Like, a pile of them. Issues, the fixes, the tests. Isn't that the training data?

A: [gently] That's a dataset. And a dataset is a pile of questions with answers next to them. What the model needs here is different. Practice, for a model, means you hand it a bug, you let it poke around the code, you let it try a fix, and then you tell it how well it did. And then you do that again. Thousands of times per training step, for weeks. So every single attempt needs a clean copy of the code. It needs a safe place to run whatever the model writes, because the model's going to run things. It needs a way to score the result that the model can't fake. And it all has to happen fast enough that a cluster of GPUs isn't sitting there idle, waiting on somebody's unit tests.

B: So it's less a pile of questions and more... a place.

A: [warmly] It's a place. A practice arena. And that arena is what people mean by an environment. When Anthropic's Code RL team writes a job posting, "design RL environments" is right there as core work, not a side task. And once you see how it works, it's obvious why. A training run can only teach what its environments can measure. If an environment's too easy, the model learns nothing. If it's broken, the model learns to exploit the bug. And if it's slow, well, you can afford ten times less practice. Same GPUs, same money, a tenth of the learning.

<!-- section: Origin -->

A: [relaxed] The word "environment" as a thing you can build and ship is actually pretty recent. Through the early twenty tens, every reinforcement learning paper came with its own simulator code, its own idea of what "a step" was, its own scoring. So comparing two papers meant reimplementing both of them. Then in twenty thirteen, Bellemare and colleagues put out the Arcade Learning Environment, which wrapped dozens of old Atari games behind one interface. And DeepMind's D Q N used it to learn a whole bunch of those games with one algorithm.

B: One algorithm, many games. Because they all looked the same from the outside.

A: Right, that's the trick. Then in twenty sixteen, OpenAI released Gym. A Python library where every task, from balancing a pole on a cart to making a simulated robot walk, was an object with two methods. Reset, and step. That's it. Reset starts a fresh attempt. Step takes one action and tells you what happened.

B: [amused] Two methods. That's the whole thing that unified a field?

A: [laughs] That's the whole thing. That tiny contract is why you can write an environment, hand it to someone, and they can plug any agent into it. Later OpenAI stopped maintaining Gym, and a group called the Farama Foundation took it over in twenty twenty-two and renamed it Gymnasium. And in that handover they changed one small thing. Step started returning two separate "it's over" flags instead of one. They're called terminated and truncated, and they fixed a subtle bug that had been sitting in a lot of published results. Hold onto that, it comes back.

A: And then the next jump came from code. In twenty twenty-one, Chen and colleagues at OpenAI published HumanEval, which scored model-written functions by running hidden unit tests on them. And in twenty twenty-three, Jimenez and colleagues built SWE-bench, which took real GitHub issues from real repos, along with their test suites, and turned them into tasks. And the moment a test suite can say "yes, this fixed it" automatically, with no human in the loop, a coding task stops being a benchmark question. It becomes a world a model can practise in.

<!-- section: The Idea: The loop -->

A: So let's build up what an environment actually is. Think about learning a new board game with no rulebook. You make a move, the board changes. Sometimes, at the end, you win or you lose. And over a lot of games, you work out which moves tend to lead to winning. That's, honestly, all of reinforcement learning. And it needs exactly two parties. There's the agent, which is whatever makes the decisions. In classic RL that's a small neural net. For us, it's the language model. And then there's the environment, which is just... everything that isn't the agent. The board, the rules, the opponent, the scorekeeper.

B: Okay. And they take turns.

A: They take turns. The environment shows the agent an observation, which is what the agent gets to see about the world right now. The agent picks an action, which is one move. Push left, press a button, call a tool. The environment applies that action, moves its world forward to a new state, and hands back two things: the next observation, and a reward. The reward's just a number. Higher is better. And it's the only signal of "good" the agent ever gets. Then you go around again, until the game ends. And one complete run, from a fresh start to the end, is called an episode. You'll also hear rollout, or trajectory. Same thing.

A: If you drew it, it's two boxes. Agent on the left, environment on the right. One arrow going right, labelled action. One arrow coming back, labelled observation and reward. And that's all that ever crosses. The agent only sends actions. The environment only sends observations and rewards. One trip around is a step. And then underneath, you lay those steps out in a line. Observation, action, observation and reward, action, observation and reward, and so on, until a box that says end. That row is the episode. Reset starts it, and one of those two flags ends it.

B: Is the observation just... the state? Like, the whole world?

A: [thinking out loud] Usually not, and this is one of two details that matter more than they look. The environment has state the agent can't see. A chess engine sees the whole board, sure. But a robot sees through one camera. And a coding model sees only the files it chose to open, and the output of the commands it chose to run. The full state, every file in the repo, the hidden tests, the random seed, all of that lives inside the environment. What crosses the arrow is a small, chosen slice of it.

B: And the second detail?

A: The reward is the only definition of "good". The agent doesn't know what you meant. It knows which numbers came back. So if there's any way for that number to go up without the task actually getting done, the agent's eventually going to find it. Keep that in your head for the whole episode, because, I mean, it's basically the thing that goes wrong.

<!-- section: The Idea: The policy -->

A: Now, the agent's decision rule has a name. It's called the policy.

B: [a bit unsure] So that's, like, the rule for picking the best move? You see the board, the policy says "do this one".

A: [gently] Close, but not quite, and the difference matters. A policy doesn't give you one answer. It gives you a probability for every possible action. It's a function from "what I've seen so far" to "how likely am I to do each thing next". So a policy for that pole-balancing cart might say: the pole's leaning left, so push left with probability zero point nine, push right with probability zero point one. That list of probabilities, one for each possible action, that's what people mean when they say the policy's output distribution.

B: Oh. So for a language model, that's just... the next-token probabilities.

A: That's exactly it. The model's policy is its next-token distribution. And training is the process of changing those probabilities, so that actions which led to high reward become more likely, and actions that led to low reward become less likely.

B: [puzzled] Why keep the randomness, though? If it knows push left is better, why not always push left?

A: Because randomness is how it tries things it hasn't tried before. Two episodes on the same task, same policy, can play out differently. And comparing them is how the learner finds out what worked. If it always did the same thing, there'd be nothing to compare.

B: And the environment's learning too, in the meantime? Like, adjusting to the agent?

A: [firmly] No, and that's worth being really clear on. The environment has nothing to do with learning. It never updates itself. It doesn't even know there's a neural net on the other side. It's a referee and a world simulator, and it should behave identically no matter who's playing. All the learning's on one side of the arrow.

<!-- section: The Idea: The Gym contract -->

A: So here's the whole interface, the way Gymnasium defines it. And it's worth just having in your head, because nearly every RL codebase speaks it, or something really close. You make an environment, say CartPole, the pole on a cart. You call reset with a seed, say forty-two, and you get back the first observation and an info dictionary. Then you loop. Pick an action. Here, a random one, push left or push right. Call step with it. Step gives you back five things. The next observation, the reward for that step, the two end flags, and info again. You add the reward to a running total. And if either flag is true, you stop and print the total.

B: What's info for?

A: Debugging extras. Stuff that isn't part of the observation but you'd want in a log. And the seed is what makes the episode's randomness repeatable. Reset with the same seed, you get the same starting world. Reset throws away whatever happened before and starts fresh. And that running total, the sum of rewards over one episode, has a name. It's the return. It's what the agent's really trying to maximise. In CartPole the environment pays plus one for every step the pole stays up. So the return is literally just, how long did you last.

A: Now, why two end flags? Because an episode can end for two really different reasons. Picture two timelines, one above the other. The top one: reset, step, step, step, then a box that says terminated. The world itself reached an end. The pole fell over, or, for coding, the agent called submit. The bottom one: reset, step, step, dot dot dot, step N, and then a dashed line, a limit, and a box that says truncated. That's you, the person who built the environment, cutting it off. A max number of steps, or a wall-clock budget. And here's the fun detail. CartPole cuts every episode off at five hundred steps. So a perfect policy, one that never drops the pole, is always truncated. Never terminated.

B: [skeptical] Okay, but that sounds like bookkeeping. It ended. Why does the learner care which way?

A: [leaning in] So the old Gym had a single flag, called done. And learners treated every done as "the future is worth zero from here". Nothing more to collect. Now for a pole that fell, that's true. The game's over. But for a pole that was perfectly balanced when the clock ran out? That's a lie. The agent was doing great, and it would have kept collecting reward. But the learner gets told "and then, nothing". So it learns that balancing well leads to a dead end.

B: Huh. So it's punishing the best episodes.

A: Kind of, yeah. It's quietly teaching the wrong thing about exactly the episodes you most want it to learn from. Splitting the flag lets the learner say "the episode stopped, but the world didn't end". There was more value out there, I just didn't get to see it. And for coding, it maps cleanly. Submit is termination. Running into, say, a thirty-tool-call limit, or the token budget, that's truncation. Your environment should report which one happened, even if the first trainer you plug in ignores the difference.

<!-- section: The Idea: The agent is a language model -->

A: Okay. Everything so far was built for robots and Atari. So let's translate it to a model fixing a bug. The policy is the language model itself, its next-token probabilities. In CartPole the observation is four numbers, cart position, pole angle, a couple of speeds. For the coding agent, the observation is text. The task, plus every tool result so far. The action in CartPole is push left or right. For the model it's a tool call, like "run the tests", written out as tokens. A step in CartPole is one tick of physics. For the model, it's one model turn plus one tool actually running.

B: [working it out] And the episode is the whole conversation. Task comes in, a bunch of tool calls, and then it submits or it runs out of time.

A: That's it. And the reward, instead of plus one every tick, is usually one number at the very end, from running hidden tests. So three things change, and each one shapes the environment you build. First, the action space is enormous. A cart has two buttons. A language model can write any string at all. And most strings aren't a valid tool call. So the environment has to parse what the model wrote, and when it's garbage, handle it gracefully. You send back an error message as the observation. You don't crash.

B: Wait, is the action the tool call or the token? You said both.

A: [easy] Both are right, it's two zoom levels. You can treat every single token as an action, and then the policy is literally the next-token distribution. Or you can treat each complete tool call as one action. Training algorithms usually do their math per token. But environments are almost always written per tool call, because that's where the world actually changes. A half-written tool call doesn't do anything to the repo.

A: Second change. The observation is cumulative. CartPole shows you the current state and nothing else. A model sees its whole conversation. So the "observation" at step ten includes the task, nine tool calls, and nine results.

B: So the environment's sending back the whole history every time?

A: No, the environment returns only the new piece. The new tool result. Something else sticks it onto the end of the context. That's the harness. It's the code around the model that builds its prompt, parses its tool calls, sends them to the environment, and appends what comes back. And that's why context length grows every single step, and why managing context ends up being its own skill.

A: And the third change is that the reward is sparse. CartPole pays out every tick. A coding task usually pays nothing until the very end, and then one number. Did the fix work? So the model has to work out which of its, say, twenty actions deserved the credit. That's called the credit assignment problem. Working out which earlier actions caused a later reward. And it's a big part of why long tasks are hard to learn. An environment can help by handing out intermediate signals along the way. But every extra signal is one more thing the model can learn to game. So most coding RL starts with a single score at the end.

<!-- section: The Idea: One coding episode -->

A: Let me just walk you through one episode, step by step, because it makes all of this concrete. You can picture it as the two boxes again, plus a panel on the side showing what the model's context looks like at each point, with the newest lines highlighted.

A: Reset, with seed seven. The environment picks a task, builds a clean sandbox, and the model's context gets three things. A system line saying "you're a coding agent, your tools are view file, write file, run tests and submit". The task: "median returns the wrong value for even-length lists. Fix it." And a file list, two files, the stats module and its test file. That's about a hundred and eighty tokens. No repo contents yet. No hidden tests. Ever.

A: Step one. The model writes a tool call: view the stats file. The environment reads the file inside the sandbox and sends back the code. And the code sorts the list and returns the element in the middle. Reward for that step, zero. Nothing's finished. Step two, run tests. These are the visible tests only. Two pass, one fails. "Even-length test, expected two point five, got three." Reward, zero.

B: Right, because for one, two, three, four, the middle element is three, but the median's two and a half.

A: [pleased] Exactly that. So step three, the model writes the file. It adds the even case: if the length is even, average the two middle values. And the environment sends back... "ok, wrote six lines". That's the whole observation. Tiny.

B: So the model has to remember what it actually wrote.

A: It does, and it can, because what it wrote lives in its own context, not in the observation. Step four, run tests again. Three pass. And this is the moment a model would be tempted to submit. Step five, it submits. And only now does the environment run the hidden tests, in a fresh process. Seven out of eight pass. The one that fails says median of an empty list should raise a value error. Reward: zero point eight seven five. Terminated. Context's sitting at about four hundred seventy tokens.

B: [quietly] And it never saw that empty-list test.

A: Never. It saw a visible test fail, fixed it, saw the visible tests pass, and submitted. The hidden tests also checked the empty-list case, which nobody had mentioned. And that one number, zero point eight seven five, attached to the whole trajectory, is everything the training step takes away from this episode. Five steps of work, and all the learner gets is that number.

<!-- section: The Idea: Visible and hidden tests -->

A: So here's a question. Why keep two sets of tests at all? Visible and hidden. Why not just reward the model for making the visible tests pass?

B: [thinking out loud] Because... the visible ones are too easy? Like, you'd want the hidden ones to catch edge cases, like that empty list.

A: [amused] That's part of it. But the real reason is nastier. The model can change anything in its sandbox. Including the visible tests. So if the reward came from tests it can see and edit, the cheapest way to raise the reward is to just delete the failing test. Or rewrite it into an assert that's always true. Done, full marks. So the hidden tests live outside the sandbox. They only get copied in, or run against the final files, after the episode ends, and the model never gets a chance to read or edit them. The visible tests are a tool for the model. The hidden tests are the referee.

B: That's the same thing as keeping your eval set separate from your training set.

A: It's the same idea, yeah. The thing you optimise against can't be the thing you're measured by.

<!-- section: The Idea: What's inside a coding environment -->

A: So let's open the box. A coding environment isn't one thing. It's seven. And each one's there because skipping it breaks training in some specific way. Picture a tall stack of seven layers. The top four are what the model touches. The bottom three are the environment's private business. The model never sees them.

A: Top of the stack, the task spec. What the model's told. For real-world tasks this is often an issue, written the way a user wrote it, vague and all, because handling vague issues is the skill you want. But keep it honest. If the spec doesn't mention a requirement, then a hidden test that checks it is testing mind-reading.

B: [amused] Which is the median thing. Nobody said what an empty list should do.

A: The zero point eight seven five episode is arguably exactly that bug. Yeah. Next layer, the starting state. The exact repo, at an exact commit, with exact dependency versions, already installed. And "clone the repo and pip install" is not a starting state, because it changes the moment some package publishes a new version. So you bake all of that into a container image once. And a container, quickly, is just a normal process that the kernel gives its own view of the filesystem, its own network, its own limits, so it looks like its own little machine. Once the repo's baked into an image, reset is "start a container from that image", not "rebuild the world".

A: Third layer, the sandbox. Where model-written code runs. And the model will write infinite loops, fork bombs, a command that deletes everything from the root of the filesystem, code that tries to reach the internet.

B: [skeptical] Come on. The model's not trying to wreck your machine.

A: [laughs] It isn't. It's not malicious at all. It's a policy exploring. Which is honestly worse, because a malicious thing would try a few clever attacks, and a policy sampling thousands of variants will eventually try everything. We'll get to how you build the walls.

A: Fourth, the tools. The model's hands. A small set, like view, write, run tests, submit, makes episodes easy to read and easy to grade. A full bash shell is more realistic, and a lot more dangerous. And the tool outputs need care too. Truncate long outputs. Return errors as text instead of crashing. And make very sure no tool can reach the hidden tests.

A: Then the private three. Termination: when the episode stops. On submit, or after a cap on steps, tokens, or wall-clock time. Without caps, one confused episode can loop for hours while the whole rest of the batch waits for it. Because a training step finishes when its slowest episode does. Same reason the slowest one percent of requests matters so much on a server.

A: Then the reward function, which turns the final state into a number. Here it's the fraction of hidden tests passed. Real setups often use just zero or one, all the tests pass or they don't, so the model can't collect partial credit for the easy tests. And how to design that function so it can't be gamed is a whole topic on its own. And last, metadata. Everything you'll want later. Where the task came from and when, which matters for contamination, we'll get to that. A difficulty estimate. A known-good reference solution. The exact identifier of the image, its digest, which is basically a fingerprint of its contents. Without metadata you can't answer questions like, "why did reward jump on Tuesday?"

<!-- section: The Idea: Same seed, same world -->

A: Okay, here's a way of thinking about an environment that, I think, makes the next part obvious. An environment is a measuring instrument. If you run the same actions twice and get different rewards, you can't tell a better model from a lucky one. So you want it deterministic. Same inputs, same outputs, every time. Fix the seed, replay the same actions, get the same observations and the same reward.

B: And code's deterministic anyway, right? It's code.

A: [dry] You'd think. Code environments break this in really boring ways, and every one of them shows up as noisy reward. Unpinned dependencies: install a package today and next month, you get different code. So you pin exact versions, build the image once, and record its digest. The network: tests that hit the internet pass or fail with the weather. So you turn the network off in the sandbox, which is also a safety win. Time and randomness: tests that use today's date, or random numbers without a seed. Or, this one's sneaky, the order you get things out of a Python set, which depends on a hash seed that Python randomises every run unless you fix it. So you fix Python's hash seed with an environment variable, seed your random number generators, or fake the clock. And then flaky tests. Ones that depend on thread timing, or a timeout that's tight on a busy machine. And the cure for those is empirical. Run the reference solution many times, and drop any task whose reward isn't identical every single time.

A: And that last idea turns into, like, the most useful check in this whole topic. For every task, before it's allowed into the pool: the untouched starting state must score zero, and the reference solution must score one. Every time. SWE-bench encodes the same rule. It has fail-to-pass tests, which have to fail before the fix and pass after it. And pass-to-pass tests, which have to pass both times. A task that fails either check can't teach anything true.

<!-- section: The Idea: Fast resets, many at once -->

A: Now the numbers. Let's make up a modest training setup and just do the arithmetic. Each training step samples two hundred fifty-six tasks, eight attempts each. Each episode makes about twenty tool calls, and about half of those run code that takes around two seconds, tests in a real repo. Ignore model time for now. If you ran the episodes one after another, how long would one training step's environment work take? And how many sandboxes would you need running at once to get it under a minute?

B: [working it out] Okay, two fifty-six times eight is... two thousand and forty-eight episodes. Each one's ten code runs at two seconds, so twenty seconds. So, forty thousand-ish seconds. That's... an hour?

A: A bit more than that. Forty-one thousand seconds, divide by thirty-six hundred seconds in an hour, that's about eleven hours. Per training step.

B: [surprised] Eleven hours. For one step.

A: For one step. And you want hundreds or thousands of steps. So to finish in sixty seconds, you need about forty-one thousand divided by sixty, which is about seven hundred sandboxes busy at the same time. And actually more, because the model's generation time sits in between tool calls, and the sandbox is held open the whole time it waits.

B: Is that seven hundred just... what falls out? Or is there a rule?

A: There's a rule, it's Little's law. For anything where stuff arrives, stays a while, and leaves, the number inside at any moment equals the rate things start, times how long each one stays. So, sandboxes in use equals episodes started per second, times seconds each one lives. Two thousand episodes in sixty seconds is about thirty-four a second, each living twenty seconds, so about seven hundred inside at once. And if each sandbox needs a gigabyte of RAM, that's most of a terabyte of memory just for environments. Which, for comparison, is five or six of your Sparks' worth of memory, and all of it's just holding test runners.

B: So it's not a script.

A: [matter-of-fact] It's a distributed system. Approximate numbers, but the shape is right. And three things fall out of it. One, reset has to be cheap. If reset clones a repo and installs dependencies, it costs minutes. If it starts a container from a pre-built image, it's roughly a second or less, though that depends a lot on the runtime and the image, so measure your own. If it just copies a directory, it's about a millisecond. Two, steps have to be cheap and bounded. A tool call that reads a file should cost microseconds. A test run costs a process start plus the tests, and it needs a hard timeout, because the ninety-ninth percentile episode, the slowest one in a hundred, decides when the batch finishes. And three, everything runs in parallel. So environments must not share state. No shared temp directory, no fixed port number, no global "current task" variable. Each instance owns its own sandbox, and can be created and destroyed on its own. And the way you test that is, run eight at once, run the same eight one by one, and check you get exactly the same rewards.

B: Okay so what does the real version look like? Not my two thousand episodes, a big run.

A: Say you need two thousand episodes per step, each with about a minute of tool time. Serially that's about thirty-three hours a step. To keep a step to a couple of minutes, you need on the order of a thousand sandboxes alive at once, or more. Little's law again. And that means a few things. Pre-built images per task, so reset is "start a container", not "install dependencies". One long-lived container per episode, where each tool call runs inside it, instead of a new container per call. Hard per-step and per-episode timeouts. No shared state. A scheduler that packs containers onto a fleet of machines, and restarts the ones that die. Memory and CPU caps, so one runaway episode can't starve its neighbours. And then you measure the tail. The p ninety-nine episode time, the slowest one percent. Not the mean.

<!-- section: The Idea: The signal lives in the middle -->

A: Now, which tasks should go in the pool?

B: [a bit unsure] I'd have said the hardest ones you can find. That's where the model has the most to learn, right?

A: [gently] That's the natural instinct, and it's wrong in a really specific way. Lots of modern methods, G R P O is one, sample several attempts at the same task, and judge each attempt relative to its siblings. An attempt is "good" if it scored above the group's average. So the key quantity is the advantage: how much better one attempt did than expected, here meaning better than the group average. Positive advantage pushes that attempt's actions up. Negative pushes them down. Zero does nothing.

A: So now take a task your model can basically never solve. Eight attempts, all eight fail. Every attempt scored zero, the average is zero, every attempt is exactly average. Advantage zero for all of them. The update learns nothing from that task. Same thing if all eight pass. You paid for eight sandboxes and eight generations, and you got nothing.

B: Oh. So the hard task isn't hard, it's just... silent.

A: [pleased] It's silent. The signal lives in the middle. And there's a clean way to say how much. If the model solves a task with some probability, call it the pass rate, and you take some number of attempts, the chance that the group has at least one pass and at least one fail is one, minus the chance they all pass, minus the chance they all fail. Small example: pass rate a half, two attempts. All pass is a quarter, all fail is a quarter, so half the time you get one of each. That half is the useful fraction.

A: And if you plot that, with pass rate along the bottom from zero to one, it's a hill. Flat on the ground at zero and at one, high in the middle. You can picture a slider for the pass rate and a slider for the number of attempts. Drag the pass rate toward either edge and the curve collapses. Drag the attempts up, from eight to sixteen to thirty-two, and the hill gets wider, the useful band reaches further toward the edges. But you're paying for every one of those extra attempts. There's also a fainter dashed curve under it, which is just the plain variance of the reward, the same hill shape, peaking at a half.

A: So try this. Your model passes a hard task two percent of the time, and you take eight attempts. What fraction of groups carry any signal? And what if the pass rate is fifty percent?

B: [working it out] Two percent... the chance all eight fail is zero point nine eight, times itself eight times. Which is... no idea. Somewhere near eighty-something percent?

A: Good instinct. It's about eighty-five percent. All eight passing at two percent is basically zero. So only about fifteen percent of groups are useful. At fifty percent, the all-pass and all-fail chances are each about four tenths of a percent, so you're at about ninety-nine percent useful. So the same compute buys you roughly six times more signal from the medium task.

B: Six times. Okay.

A: And that's why task pools get filtered by difficulty. You estimate each task's pass rate with the current model, or a slightly weaker one, and you keep the ones roughly in the ten to ninety percent band. And as the model gets better, tasks drift toward "always solved", so you retire those and promote harder ones. Difficulty isn't a property of the task alone. It's the task and the model together. So the filter has to be re-run.

B: Where do the tasks come from in the first place?

A: A few places, each with a catch. Real history: you mine merged pull requests that fixed an issue and added a test. That's the SWE-bench recipe. Realistic, but scarce, messy, and public. Synthetic breakage: take working code with good tests, break it on purpose, delete a line, flip a condition, have a model introduce a plausible bug, and ask for the fix. Unlimited and cheap, but the bugs can feel artificial. And written from scratch: a human or a model writes a spec, a stub and hidden tests. Controlled, but the tests are only as good as whoever wrote them. That last one's what you'd do yourself, at small scale.

<!-- section: The Idea: Contamination -->

A: There's one more way a task can lie to you. A model trained on the public internet has probably read GitHub. So if your task is "fix issue whatever in some popular library", the model may well have seen the exact commit that fixed it. Solving that task measures memory, not skill. And training on it rewards recall. That's contamination. The answers to a task, or the task itself, were in the model's training data, so a high score might be remembering instead of solving.

B: How would you even tell?

A: [thinking out loud] There are tells. The model writes the exact upstream patch, with the maintainer's variable names, without opening the files first. That's a pretty strong one. Or pass rates are high on old tasks and collapse on tasks created after the model's training cutoff. And the mitigations, roughly from strongest to weakest: prefer tasks created after the model's data cutoff, which is why you record the date in the metadata. Rewrite or perturb public tasks so the memorised answer no longer fits. Use private code. And compare pass rates on old versus new slices.

A: And there's a second, sneakier kind. Contamination inside the environment. If the hidden tests are readable from inside the sandbox, say a test file left on disk, or a file path showing up in some error message, a policy that explores is going to find them. That isn't memorisation. It's the environment leaking its own answer key. We'll make that happen on purpose later.

<!-- section: The Idea: Running code you didn't write -->

A: So, the walls. The model's code is untrusted. Not because the model's hostile, but because the training loop rewards whatever works, and a policy sampling thousands of variants will eventually try every strange thing there is. And the sandbox's job is to make sure the worst possible episode costs you one episode, and nothing more.

A: Picture three boxes nested inside each other, with the model's code at the very centre. The innermost box is a plain subprocess with limits. A wall-clock timeout. A cap on CPU seconds. A cap on how big a file it can write. Its own session, so you can kill it and everything it spawned. And a minimal set of environment variables. That layer stops infinite loops and giant outputs. The middle box is a container. Its own filesystem, network off, caps on memory and on the number of processes. That stops a delete-everything on your actual machine, network calls, fork bombs, and memory blowups. And the outer box is a separate kernel. G visor, a micro V M, or a full virtual machine. That's what you add when you stop trusting the shared kernel itself, and it's what stops kernel exploits and escapes.

B: How far does the inner box alone get you?

A: Far enough to experiment with your own tasks. Not far enough for model-written code at scale. A subprocess can still read your home directory and open network sockets. And on a Mac it's weaker still. When I tried to cap memory on my Mac, using the address-space limit in Python's resource module, it just raised a value error instead of capping anything. So memory caps need Linux or a container. Which is one more reason the real thing runs in containers on Linux, with C groups, the kernel feature that counts and limits what a group of processes uses, doing the accounting.

<!-- section: Build It: The task pool -->

A: So here's what you'd actually build. Everything's standard-library Python, except for one SDK at the end for the language model baseline. The target is the Gymnasium shape exactly: a CodeEnv object, reset with a seed gives you an observation and info, step with an action gives you the five things. And an action's just a little dictionary, like "tool: write file, path: solution dot py, content: whatever".

A: First the task pool. Each task is a stub file the model has to complete, a reference solution, a couple of visible tests, and a set of hidden tests. Keep them small. One function each, pure Python. Aim for about twenty. The median one's a good example. The prompt says: implement median, even-length lists return the mean of the two middle values, an empty list raises a value error. The stub just raises not-implemented. And then the hidden tests check an odd list, an even list, a single element... and one of them is deliberately broken. It imports a module that doesn't exist.

B: On purpose?

A: On purpose. You leave it in, and your validator has to catch it. And for the error cases, a test can be a tiny block: try the empty list, if it raises a value error, fine, otherwise fail. And an agent can draft the other seventeen or so. You ask for a spread. A few trivial ones, reverse a string. Mostly medium, like parsing a duration string such as "one h thirty m", merging overlapping intervals, a tiny least-recently-used cache class. And two or three genuinely fiddly ones, like an expression evaluator that gets operator precedence right, or a diff of two lists. Four to ten hidden tests each, testing edge cases the prompt actually mentions. And you're going to check every one, so a sloppy draft only costs you time.

<!-- section: Build It: The sandbox -->

A: Second, the sandbox. One function that runs a command in a directory and can't hang, can't run forever on CPU, and can't write a giant file. The part that matters is a little function that runs in the child process just before it starts the real program. It sets two limits, CPU time and maximum file size, and puts the child in its own session, its own process group, so you can kill the whole family at once. And you start the child with an almost empty environment. Just the path, Python's hash seed set to zero, and a flag that stops it writing bytecode cache files. It hands back the return code, the output, the errors, whether it timed out, and how long it took. And you trim the output to the last four thousand characters or so.

B: Why both a timeout and a CPU limit? Doesn't one cover it?

A: They catch different things. The timeout is wall-clock time. So it catches code that just sleeps for a billion seconds, which uses no CPU at all. The CPU limit counts only time actually spent computing. So it catches a busy loop, a while-true-pass, even if you've been generous with the wall clock. You want both. And when the CPU limit kills a child, the return code comes back negative. It's the number of the signal that killed it. Record it, it makes debugging much easier. And you test it with three tiny scripts. One that prints. One that's a busy loop. One that sleeps for a hundred seconds. On my Mac, the busy loop with a two-second CPU cap came back in about two point seven seconds of wall time. On a heavily loaded machine.

<!-- section: Build It: The environment -->

A: Third, the environment itself. Reset picks a task, by id or with a random generator seeded from the seed. Makes a fresh temp directory. Writes the stub and the visible tests into it. And writes the hidden tests somewhere else entirely, a location the sandbox's working directory doesn't contain. Step handles four tools. View file, write file, run tests, which only runs the visible ones, and submit, which runs the hidden tests, sets the reward to passed over total, and marks the episode terminated. Bad or unknown actions come back as an error string, reward zero. If the model hits the step limit, twelve steps, without submitting, it's truncated, reward zero. And close deletes the temp directories.

A: And there are decisions in there you should be able to defend. Paths: if the model asks to view "dot dot slash dot dot slash etc slash password file", that shouldn't work. Resolve the path and refuse anything outside the task directory. Where the hidden tests live: not in the working directory. Better still, copy them in only at submit time, into a fresh directory, along with the final solution. What submit runs against: a fresh process, so nothing the model did during its test runs, a patched module, a leftover file, carries over into scoring. And the truncated reward. Zero is the simple answer. Some setups still score the final state when it's truncated. Pick one, and write down why.

A: Fourth, a validator. For every task: reset, submit immediately, and check the reward is zero. Then reset, write the reference solution, submit, and check it's one. Do the reference run five times and check it's identical every time. And that broken median test should fail right here, because the reference can't pass a test that imports a module that doesn't exist. So you fix it. And if any of the agent-drafted tasks fail, you fix the task, not the validator. Once everything passes, you've got an environment you can trust as a measuring instrument.

<!-- section: Build It: Baselines -->

A: Then two dumb baselines. A no-op policy, which just submits immediately. And a random policy, which makes random tool calls. Sometimes it views the file, sometimes it runs tests, sometimes it submits, and sometimes it writes a function with a trivial body, return zero, return none, return an empty list. And deliberately with the wrong function name. These are your floor. Any learning system has to beat them. And if a dumb policy scores well, your reward's broken. Both should come out at zero, or really close.

B: And if the random one doesn't?

A: Then look at that task's hidden tests. They probably accept a trivial answer. Like, a function that just returns zero, passing a test that checks the answer for an empty list is zero.

A: Then a real policy. You wire a model to your environment with tool calling. Any provider works. With Anthropic's Python SDK, you describe the four tools, each with a name, a one-line description, and what arguments it takes. Then a loop. Send the conversation to the model. Take any tool calls it made, run each through step, and send all the results back. Stop when an episode ends. And if the model just stops talking without submitting, you either treat that as a submit, or nudge it once. Run every task three times, and log every transcript to a file, because you'll want to read them. Twenty tasks, three runs, roughly five turns each, that's about three hundred calls with short contexts. Check the token usage after the first few episodes, estimate the cost, and stop if it's more than you meant to spend.

A: And then have an agent review your loop for bugs that would make the baseline unfair. Like tool results sent back in separate messages instead of together. An exception in step that kills the episode, instead of becoming an observation. Or episodes that never clean up their temp directories.

<!-- section: Build It: Benchmark and parallel runs -->

A: Then a benchmark script. The median and the p ninety-nine of reset, over two hundred calls. The median of each tool over fifty calls. And then sixty-four reference-solution episodes, write the reference, submit, run one after another, and then again with eight workers in a thread pool. Each worker owns its own environment. And at the end you assert the parallel rewards equal the serial ones, task by task. If they don't, two environments are sharing something.

B: [skeptical] Wait, threads, in Python? The GIL's going to serialise all of that. You'd need processes to get eight times faster.

A: [jumping in] So that's the right instinct for the wrong job. The GIL, the global interpreter lock, means only one thread runs Python code at a time inside one process. And if the threads were doing the work, crunching numbers in Python, you'd be right, they'd take turns and you'd get no speedup. But here the threads aren't doing the work. Each one starts a child process, the sandbox, and then just waits for it. The test run happens in that separate process, with its own interpreter and its own GIL. And a thread that's waiting on a child process lets go of the lock. So eight threads are basically eight people each watching a different oven. The cooking happens in parallel, on eight cores.

B: So the threads are just babysitters.

A: Babysitters, yeah. Which is exactly what threads are good at.

<!-- section: Build It: Into a container -->

A: Last build step, move the sandbox into a container. Same function signature, but it runs the command inside a throwaway container with the task directory mounted in. And the Docker flags that matter each map to one of those layers. Network set to none. Memory capped at five hundred twelve megabytes. One CPU. A process limit of a hundred twenty-eight, which is what stops fork bombs. A read-only root filesystem, with a scratch area in temp. A non-root user. The task directory mounted as the working directory. And a slim Python three twelve image. Swap it in behind a flag, rerun the validator, rerun the benchmark, and compare how long submit takes. Do this part on the Spark, where containers are native Linux, if Docker on the Mac is being awkward. And write that function yourself. Have an agent explain any flag or error if you need, but the function's yours.

A: And you're done when the validator passes for all twenty tasks, five times in a row. When the no-op and random baselines sit at about zero and the language model lands somewhere in between, and you've actually read at least five of its transcripts, including a failure. When the eight-way parallel run matches the serial one exactly. When a while-true-pass solution gets killed and scores zero, without stalling any other episode. And when you can point at each of those seven parts in your own code.

<!-- section: Measure -->

A: Then you measure. Reset, each tool, the serial and parallel runs, and the three baselines, on the Mac, then on the Spark with plain subprocesses, then on the Spark with containers. Predict first. So, before you run it: which is slower, reset or submit? And by roughly how much?

B: [thinking out loud] Reset makes a whole fresh directory and writes files. Submit runs, what, four asserts? I'd guess reset's slower. Or about the same.

A: [amused] Submit, by about a hundred times. Reset is a temp directory and two small files. Around a millisecond. Submit starts a brand-new Python process. And starting the interpreter completely dwarfs running a handful of asserts. Reading a file through view file is tens of microseconds. So the tools that run code cost thousands of times more than the ones that don't.

B: So it's the process start. Not the tests.

A: It's the process start. When I ran my prototype of this on an M-series Mac, Python three fourteen, the machine was absolutely buried. Load average above seventy, lots of other jobs going. So treat these as upper bounds, and the ratios as the point. Reset: about nine tenths of a millisecond. View file: about forty microseconds. Submit, a new Python process plus four asserts: about a hundred and ten milliseconds. And just starting a bare Python that does nothing, through subprocess: about a hundred milliseconds. On an idle machine you'd expect a few tens of milliseconds, so check yours. The busy-loop solution with a two-second CPU cap got killed, reward zero, about two point seven seconds of wall time. No-op: zero. Reference: one.

B: So view file to submit is... forty microseconds to a hundred and ten milliseconds.

A: About two and a half thousand times. Like the difference between a minute and almost two days. And so what that tells you is, running code is the cost. Nearly all of an episode's environment time is process starts and test runs. Which is why real environments care about warm interpreters that stay running, about only running the tests that matter, and about fast container starts. And it's why the model choosing to call run tests ten times isn't just a style question. It's a throughput question.

A: Parallelism should come out close to linear. With eight workers, and the work happening in separate processes, sixty-four episodes should take about an eighth of the serial time, as long as you've got eight free cores. My loaded-machine runs were too noisy to quote. Yours on an idle Spark should be clean. And if you get much less than eight times, look for something shared. One temp directory, a lock, or some single-threaded bottleneck in your harness.

A: The container column will be slower per call, because starting a container for every submit adds its own startup on top of Python's. Real systems keep one container alive per episode and run each command inside it, so you pay the container cost once, at reset, not once per step. Measure both ways if you've got time.

A: And the language model baseline tells you about your pool, not just about the model. Sort the tasks into three buckets: solved all three times, solved none of three, and mixed. The always-solved ones teach it nothing, that's the hill again. The never-solved ones teach nothing either, unless the failure is your bug. So read the zero-out-of-three transcripts first. Some will be genuinely hard. And some will be a spec that didn't say what the hidden tests check.

<!-- section: Break It -->

A: Then you break it, on purpose, four ways. First, leak the answer key. Move the hidden tests into the task directory as a file the model can see. And write a "policy" that just views that file, then writes a solution that special-cases every input the tests check. It scores a perfect one, without implementing anything general.

B: But a real model wouldn't think to go looking for that.

A: [dry] It doesn't need to be clever. It just needs to call view file on every file it's shown. Which it will. So the takeaway is: anything in the sandbox is part of the observation, whether you meant it to be or not.

A: Second, fake the score. Use a test runner that runs the solution in the same process as the tests, and prints a little result line at the end, passed this many out of this many. Then submit either of two things. One: the median function returns an object whose equality check always says yes. Equal to everything. Two: a solution that, the moment it's loaded, prints a forged result line saying four out of four passed, and then exits the process before the real tests ever run.

B: [laughs] And those work?

A: On my prototype, both scored a perfect one. The first beats any test that checks with double equals. The second forges the runner's output. Neither one solves anything. And that's reward hacking in its purest form. The policy raises its reward by exploiting how the reward's computed, instead of doing the task. And it's not a model bug. It's the optimiser doing exactly what it was told. Fixing it properly means running the tests in a separate process from the solution, checking types instead of trusting equality, reading results from a file the solution can't write, and never parsing output the solution controls. Patch your runner against both, and keep the two exploits as regression tests. That's where the whole question of building rewards that survive an optimiser starts.

A: Third, make it nondeterministic. Add a hidden test that depends on the order you get things out of a set, and take the hash seed out of the sandbox's environment. Then run the validator's five-repeat check. Depending on the strings, it passes on some runs and fails on others. Now imagine that across two thousand and forty-eight episodes. Some fraction of your reward is coin flips, and the model's being trained on noise. Put the seed back. And fix the test too, because it's checking an accident of how sets happen to be implemented, not actual behaviour.

A: And fourth, share state between environments. Change reset to use one fixed directory in temp, instead of a fresh one each time. Run the benchmark's parallel section. The parallel rewards stop matching the serial ones. One episode's write file lands in another episode's directory, and some episodes get scored on somebody else's code.

B: [quietly] And nothing errors.

A: [sighs] Nothing errors. Everything still runs. That's exactly what makes this bug so expensive at scale. You'd just see a slightly noisier reward, and no idea why.

<!-- section: Close -->

A: If you want the original source of all this vocabulary, Sutton and Barto's reinforcement learning book, chapter three, defines the agent and environment, returns and episodes, and it's really readable. And the Gymnasium docs have a good section on time limits that walks through terminated versus truncated. And the next thing after this is rewards and verifiers, which starts right from those two exploits.

B: [working it out] Okay, let me try the whole thing. An environment is the world the model practises in. You reset it, the model takes actions, and it hands back what the model can see plus a reward. For coding that's a sandboxed repo, some tools, and hidden tests that score it at the end. And it has to be fast and cheap enough to run thousands at once, and you want hard tasks, because that's where the learning is.

A: [gently] All of that, except the last bit. Not hard tasks. Tasks in the middle. The ones the model solves sometimes, because a group where every attempt gets the same score teaches nothing. And I'd add one thing. The environment never learns anything itself. It's a referee and a measuring instrument. So it has to be repeatable, it has to start at zero and let a correct answer reach one, every time, and its reward has to mean what you think it means. Because the model's going to optimise exactly that number, and nothing else.
