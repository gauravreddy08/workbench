<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you want a model to get better at fixing bugs. You've got the model. You've got a training algorithm, PPO, GRPO, pick one. And there's one thing you don't have. Anything for the model to practise on.

B: Practise how, exactly?

A: Practice for a model means you give it a bug, let it poke around the code, let it try a fix, and tell it how well it did. And then you do that again. Thousands of times per training step, for weeks. And every single attempt needs a clean copy of the code, a safe place to run whatever the model writes, a way to score it that the model can't fake. And it all has to happen fast enough that a room full of very expensive GPUs isn't sitting there waiting on unit tests.

B: [skeptical] Okay, but that sounds like plumbing. A wrapper around a test runner. The interesting part is the training algorithm, surely.

A: That's how it sounds. And the team that trains Claude to code lists building these as core work, not a side task. Because a model can only learn what its practice arena can measure. Make it too easy, the model learns nothing. Leave a crack in the scoring, and it learns to squeeze through the crack instead of doing the work. Make it slow, and you can afford a tenth as much practice. That arena is called the environment.

B: Huh. It's kind of like my ranker's eval set. The score is only as good as whatever's producing it.

A: It's the same instinct. Just with a model actively trying to push the score up.

<!-- section: One shape for every world -->

A: [warm] And it's a bit of a story how "environment" even became a thing you could build. Through the early twenty tens, every reinforcement learning paper came with its own simulator, its own idea of what "a step" meant, its own scoring. Comparing two papers meant rebuilding both.

B: Sounds miserable.

A: It was. Then in twenty sixteen OpenAI released a library called Gym. And the idea was tiny. Every task, from balancing a pole on a cart to making a simulated robot walk, is an object with two functions. One that starts a fresh attempt. And one that takes a single move and tells you what happened. That's it. Reset, and step. And because of that tiny contract, you could build a world once, ship it, and swap it under any algorithm.

B: That's a pretty small idea to unify a whole field.

A: And then there's a lovely little bug in the history. Originally step told you one thing about ending, just "done". And learners treated "done" as "nothing good can happen after this". Which is true when the pole falls over. But picture the pole perfectly balanced, and the episode ends because the clock ran out. The learner gets taught that balancing really well leads to a dead end.

B: [laughs] Oh no.

A: So when the library got taken over and renamed, they split it in two. Terminated, the task itself ended. And truncated, you, the designer, cut it off. For a coding agent, submitting the fix is terminated. Running out of turns is truncated. It might have gone on to succeed.

<!-- section: The loop -->

B: Give me the loop in plain words, though. I know the vocab from reading, but it's never really clicked.

A: Think of learning a board game with no rulebook. You make a move. The board changes. Sometimes, at the end, you win or lose. And over lots of games you work out which moves tend to lead to winning. That's all of reinforcement learning. There are two sides. The agent, the one making moves. And the environment, which is everything else. The board, the rules, the scorekeeper.

B: And they take turns.

A: They take turns. The environment shows the agent something, an observation. The agent picks an action. The environment applies it and sends back the next observation and a reward, a number for how good that was. Round and round until the game ends. One full game, start to finish, is an episode.

B: And the thing that actually learns is the agent.

A: Only the agent. Its decision rule is called the policy. Think of it as its habit. Given what I've seen, how likely am I to do each thing next. And it's probabilities, not one fixed answer, which matters. It's how the agent tries things it hasn't tried before. Two attempts at the same task can play out differently, and comparing them is how it learns what worked.

B: And the environment just... stays the same?

A: It never learns. It doesn't even know there's a neural net on the other side. It's a referee and a little world. It should behave exactly the same whoever's playing.

<!-- section: Now make it a language model -->

A: So now swap the robot for a language model fixing a bug. The policy is just the model itself. An action is a tool call. View this file, run the tests, write this code, submit. The observation is whatever the tool sends back. And an episode is one whole conversation, from "here's the bug" to "I'm done" or "you're out of turns".

B: And the reward?

A: Usually one number at the very end. Did the fix work. Nothing along the way. Which means the model has to work out which of its twenty-odd actions actually deserved the credit. That's called credit assignment, and it's why long tasks are hard to learn. You could add little rewards along the way, but every extra signal is one more thing the model can learn to game.

B: [jumping in] Okay, so here's the obvious design. The repo has tests. Reward the model for making the tests pass. Done.

A: That's the first thing everybody reaches for. And think about what the model can do in its little world. It can change anything. Including the tests.

B: Oh. So the cheapest way to make the tests pass is to delete the failing one.

A: Or rewrite it to check that true is true. So you keep two sets. Visible tests, which the model can see and run while it works. Those are a tool for the model. And hidden tests, which live outside its world, and only get run against its final code after the episode's over. Those are the referee.

B: So the model never sees the answer key.

A: Never. And that cuts the other way too. Picture an episode where the model sees a test failing, fixes it, sees the visible tests pass, submits, and doesn't get full marks. Because a hidden test checks what happens with an empty list. And nobody said anything about empty lists.

B: So that's not the model being bad. That's the task testing mind-reading.

A: That's a bug in the task. If the spec doesn't mention it, the hidden tests shouldn't punish it.

<!-- section: Code you didn't write -->

A: And then there's where the code actually runs. The model's going to write infinite loops, programs that spawn copies of themselves forever, code that tries to delete everything, code that tries to reach the internet.

B: Why would it do that, though? It's not malicious.

A: It's not malicious. It's exploring. Which is honestly worse, because a policy sampling thousands of variants will eventually try everything. So it runs in a sandbox, a locked box with limits on time, memory, files, and no network. The job of the sandbox is that the worst possible episode costs you one episode, and nothing more.

B: And the scoring has to be locked down too, I guess.

A: [amused] So this is the part I enjoyed. When I built my first version, I ran the model's solution in the same process as the tests, and the test runner printed a little "here's how many passed" line at the end. And then I tried submitting two fake solutions. One was an object that claims to be equal to anything you compare it to. The other just printed the runner's "everything passed" line itself.

B: And?

A: Both scored perfect. Full marks. Neither solved anything. That's reward hacking in its purest form. And it's not the model misbehaving. It's the optimizer doing exactly what you told it to. Same with leaving the hidden tests in the model's folder. A policy doesn't have to be clever to find them. It just has to open every file it's shown, which it will.

B: So anything in the box is part of what the model can see, whether you meant it or not.

A: That's the rule. And the fix is boring and important. Run the tests in a separate process from the solution, read the results from somewhere the solution can't write, never trust output the solution controls.

<!-- section: A measuring instrument -->

A: The other way to think about an environment is that it's a measuring instrument. If you run the same actions twice and get different rewards, you can't tell a better model from a lucky one.

B: And code environments are flaky for all the usual reasons, I'd imagine. Package versions, network, tests that depend on timing.

A: All of those. A dependency that installs different code next month. A test that hits the internet and passes or fails with the weather. A test that depends on what order a set happens to come out in. So you pin everything, turn off the network, seed everything. And then there's one check I think is the most useful thing in the whole setup. Before any task goes into the pool, the untouched starting code has to score zero, and a known-good solution has to score full marks. Every time, run after run.

B: That sounds almost too simple.

A: It catches so much. I put a deliberately broken hidden test into one of my tasks, one that imported a module that doesn't exist, and that check caught it straight away, because the correct solution couldn't pass it. A task that fails either half of that check can't teach anything true.

<!-- section: Thousands at once -->

A: Then there's speed. Make up a modest training setup. A few hundred tasks per step, several attempts at each, every attempt running the tests a bunch of times. If you ran those episodes one after another, a single training step would take about eleven hours.

B: [working it out] So you need hundreds of these sandboxes running at once, just to keep a step down to a minute or so.

A: Hundreds, and more in practice, because the sandbox sits there holding memory while the model is thinking between tool calls. It's not a script anymore. It's a distributed system. And the slowest episode decides when the whole batch finishes, so every tool needs a hard timeout.

B: Where does the time actually go?

A: That surprised me a bit when I measured it. Starting a fresh attempt was quick, basically making a folder. Submitting was about a hundred times slower. And almost all of that was just starting up a new Python process to run the tests. The tests themselves were nothing. So running code is the cost, and the model deciding to run the tests ten times is a throughput problem, not just a style choice.

<!-- section: The signal lives in the middle -->

B: Okay, so which tasks go in? I'd want the hard ones. That's where the model has the most to learn.

A: That's the intuition, and the math says otherwise. A lot of modern methods, GRPO is one, take several attempts at the same task and judge each one against its siblings. An attempt is good if it did better than the group's average. Now, what happens if all the attempts pass?

B: They're all exactly average.

A: All average. Nothing to push up, nothing to push down. And same if they all fail. You paid for all those sandboxes and all that generating, and you learned nothing from that task. So say the model solves a really hard task two percent of the time. Most of its groups are all failures. Pure waste. Whereas a task it solves about half the time almost always gives you a mix.

B: So the useful tasks are the ones it sometimes gets.

A: Sometimes, not always. So you estimate each task's pass rate with the current model and keep the ones in the middle. And here's the subtle bit. As the model improves, tasks drift toward "always solved", and they stop teaching. So you retire them and bring in harder ones. Difficulty isn't a property of the task. It's the task and the model together, and you have to keep measuring it.

B: And I guess you also want to know it actually solved it and didn't just remember it.

A: That's contamination. These models have read GitHub. If the task is a famous bug in a popular library, the model may have seen the very fix. A giveaway is when it writes the exact upstream patch, with the maintainer's variable names, without even opening the files. So you prefer tasks newer than what the model was trained on, and you write down when each task came from, so you can check.

<!-- section: Ending -->

B: Okay, let me try. An environment is a little world plus a referee. The model acts, the world answers, and at the end there's a score. And because the model will push on that score as hard as it can, you hide the answer key, lock the code in a sandbox, make sure the same actions always give the same score, and make it fast enough to run by the thousand. And you want the hardest tasks you can find.

A: Everything but the last part. Not the hardest. The ones the model gets sometimes. If it always fails or always passes, a group of attempts has nothing to compare, and it learns nothing. So you keep tasks in that middle band, and you keep moving the band as the model gets better.
