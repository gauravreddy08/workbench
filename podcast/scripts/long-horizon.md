<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you give a coding agent a little job. Rename a config key in one file, fix the one test that uses it. It nails it. Then you give it a real migration. Forty files, and each change depends on the one before. It runs for an hour. It tells you it's done, everything worked. And then the test suite fails.

B: Ugh. Where'd it go wrong?

A: Somewhere around file twelve, it misread a value. And every file after that was built on the misread. So you go through, and every single edit looks reasonable. Each one is a perfectly sensible thing to do given what came before. And the whole thing is wrong.

B: [a bit unsure] I mean, my first guess would be it just gets dumber as it goes. Long tasks, more confusion, worse model.

A: That's part of it, and we'll get to that part. But mostly, no. Each step is about as likely to go right at file forty as at file one. What changed is that you asked it to be right forty times in a row, with nobody checking in between. And that turns out to be a much harder thing than it sounds. You can put numbers on exactly how much harder.

<!-- section: How long is long -->

A: So first, what makes a task long? It's not how much text gets written. Think about learning to bake. In one version, a teacher's standing next to you, and the moment you pour in too much flour she says "too much flour". In the other version, you're alone, and the only feedback is whether the cake tastes good three hours later.

B: Same recipe.

A: Same recipe, same number of actions. But the second one is way harder to get right, and way harder to learn from. Because when the cake's bad, you've got no idea which of the forty things you did caused it.

B: So "long" means long between check-ins.

A: That's the definition. The horizon of a task is how many steps happen before you find out whether it worked. A step for a coding agent is usually one tool call, read a file, run a command, write an edit. So a model writing a huge essay in one go has a short horizon, really. One shot, graded once. An agent doing sixty tool calls that only gets graded when the final tests run, that's a horizon of sixty.

B: And the longer that is, the more chances to be wrong.

A: More chances to be wrong, and mistakes stay hidden longer. Those are the two halves of the problem.

<!-- section: The van that couldn't recover -->

A: [warm] There's an old story that captures this really well. Nineteen eighty-nine, at Carnegie Mellon. Dean Pomerleau builds a small neural network called ALVINN that steers a van by watching a human drive. And it learns to copy the human pretty well.

B: Okay.

A: But think about what the training data looks like. A human driver almost never drifts halfway off the road. So the network basically never saw what to do when you're already drifting. So it makes a small steering error, and now it's somewhere it's never been. So it makes a bigger error. And drifts further.

B: [working it out] Each mistake puts it somewhere it's worse at.

A: Right. And Pomerleau's fix was lovely. He made up fake camera images, shifting the view as if the van were off-centre, and labelled them with the correction. He taught it to recover. Years later people made this precise for any model that learns by copying. Its mistakes don't just add up. They pile up faster than that, because each one moves it into territory where it makes more. And that exact worry came back with language models. If every step has some little chance of going wrong, a long enough task almost certainly goes wrong somewhere.

B: So is it hopeless?

A: Depends entirely on recovery. Which is where most of the interesting stuff is.

<!-- section: Right forty times in a row -->

A: But first, the plain arithmetic, because it's more brutal than your gut says. Say an agent gets each step right ninety-nine percent of the time. And say any wrong step ruins the task. How does it do on a hundred-step task?

B: [confident] Ninety-nine percent sounds great. I'd guess it usually finishes.

A: It finishes about a third of the time. It fails most of them. And it hits a coin flip at around seventy steps.

B: Huh. That's a big drop for one percent.

A: And here's the rule that falls out of it, which I think is the most useful thing in this whole area. The length an agent can handle is inversely proportional to how often it messes up. Halve the failure rate, and you double the length it can handle. So going from ninety-eight to ninety-nine percent sounds like a rounding error. It actually doubles how long a task you can give it. Going from ninety-nine to ninety-nine point nine makes it ten times longer.

B: That's actually a kind of radioactive decay thing, isn't it? Same chance of dying every step.

A: Exactly the same math. A constant chance of failing at every step, so the number of runs still alive shrinks the same way. You can even talk about the agent's half-life, the number of steps after which half your runs have failed. Hold onto that, because it comes back.

B: And this is why demos are so misleading. A demo is one short run.

A: That's a big part of why. And there's a second trap. If you simulate a bunch of agents at ninety-five percent per step on a forty-step task, and you count how many steps were right overall, it's about ninety-five percent. Looks great. And only a few of the runs finished. Per-step accuracy and end-to-end success are wildly different numbers. If someone quotes you one, ask for the other.

B: And everything after the fatal mistake is just wasted.

A: Work you paid for that could never succeed. And that's the expensive failure on long tasks. Not the run that crashes on step three. It's the one that makes a quiet mistake at step twelve, and keeps going, confidently, all the way to step forty.

<!-- section: Real agents fix things -->

B: [skeptical] But hang on. If that math were the whole story, agents would be useless. Nobody's at ninety-nine point nine on hard steps, and agents do finish long tasks.

A: Right, and that's the missing piece. A mistake isn't always fatal. Watch a good engineer work. They mistype a path, the command fails, they fix it. That mistake cost one step. They write a function with an off-by-one bug, the test fails, they fix it. That cost a few steps. Only some mistakes kill a project. The ones nobody notices until too late, and the ones you can't undo.

B: So it's not how big the mistake is. It's how fast it shows up.

A: How fast it shows up, and whether you can take it back. So now you split every step into two questions. Did it go right? And if it didn't, does the agent notice and fix it before it matters? That second one is recovery. And a step only kills the task if it goes wrong and doesn't get fixed.

B: [working it out] So an agent that makes twice as many mistakes but catches half of them...

A: Has exactly the same horizon as the careful one. Recovery and accuracy multiply. Recovering from half your mistakes is worth the same as making half as many. Which matters a lot for training, because getting a model better at noticing and fixing might be easier than getting it to never slip.

B: Nice. So they're interchangeable.

A: On paper. In practice there's a catch. The sloppy-but-recovering one uses more steps, every fix costs something. And its whole advantage depends on mistakes being visible. Put it somewhere errors are silent, no error messages, no tests, and its recovery drops toward nothing, and its horizon falls apart. The careful one doesn't care. That's one reason the same model can score so differently in different harnesses.

<!-- section: Making mistakes loud -->

A: So the natural engineering move is to make mistakes visible on purpose. Run the tests after each edit. Type-check after each file. Anything that checks the work and says pass or fail is a verifier.

B: And if you check after every single step, you basically can't fail.

A: If the check is perfect, nearly. Each step only fails if every retry is wrong too, and that's very rare. But here's the part I found really interesting. Make the check catch only half the bugs. You get some of the gain, and you lose most of it. Because every bug that slips past is still a silent fatal mistake. And you get a fresh chance of one at every step. Checking more often with a weak check mostly buys you more chances to be fooled.

B: So a better check beats checking more.

A: Quality over frequency. And the worst case is a weak check the agent believes. Because then it stops looking. An agent that writes a test that always passes, and then reports success, that's the long-task version of this, and it's worse than no check at all, because it feels safe.

<!-- section: What METR measured -->

B: You said the half-life thing would come back.

A: So there's a group called METR, a nonprofit that tests AI systems. And they had a problem. Counting steps doesn't compare across tasks. One step of "write a regex" isn't the same size as one step of "design the database schema". So they measured tasks in human time instead. They got skilled people to do a big set of software tasks and timed them, from a few seconds to many hours. Then they ran AI models on the same tasks, and for each model found the task length where it succeeds half the time.

B: And that's the time horizon.

A: That's the time horizon. And the headline was, the best models in early twenty twenty-five were at around fifty minutes. And the frontier's horizon has been doubling roughly every seven months.

B: So the best models can work on their own for about fifty minutes.

A: That's the misreading everybody makes. It doesn't say that. It says on tasks that take a skilled human about fifty minutes, the model succeeds about half the time. The model itself might take five minutes or two hours. And there are other things to keep straight. It's tied to that set of tasks, which are clean, well-specified, automatically graded. Messy real-world tasks do worse. Half the time is a low bar. If you'd hand something off unsupervised, you care about a much stricter bar, and that horizon is several times shorter. And the doubling is a trend someone measured, not a law of nature.

B: Where's the half-life come in?

A: Toby Ord went back over their data and found it fits really well with exactly that constant-chance-of-failing picture. A fixed chance of failing per minute of human work. And under that picture, "the horizon doubles every seven months" means the same thing as "the failure rate halves every seven months". Which is our rule again. And METR themselves say the gains seem to come mostly from models getting more reliable and better at adapting to their mistakes. Which is the careful part and the recovery part.

<!-- section: Worse than coin flips -->

B: Okay, but going back to my first guess. Does the model get worse as the task goes on?

A: [laughs] Yeah, this is where you get to be partly right. The coin-flip picture treats every step as independent. Real long tasks break that, in the bad direction. The agent has to keep track of what it's done. Which files did I edit, did I already rename that function, what was the value in file twelve? Humans offload that to the codebase and their notes. The agent has to keep it in context or work it out again. So the error rate per step actually goes up as the task goes on, because there's more to keep straight.

B: And the context fills up with logs.

A: That too. The fact from step twelve gets buried under a hundred and fifty steps of output. And then there's feedback arriving late, so recovery is easy for mistakes that throw an error right away and nearly impossible for ones that only show up much later. And then irreversible actions. Dropping a table, sending an email, a force push. For those, recovery is zero by definition, no matter how smart the model is.

B: So that's what sandboxes and undo are for.

A: That's how I think about most of what makes a harness safe. It turns steps you can't recover from into steps you can. It raises recovery from the outside.

<!-- section: Learning from one verdict -->

A: And then there's the training side, which is why this matters for coding RL. In reinforcement learning, the model tries a task, gets a reward, a number saying how it did, and training nudges it toward whatever got rewarded. For a three-step task with a reward at the end, it's pretty clear which steps to credit. For a sixty-step task with one pass or fail at the very end...

B: Which step was the bug?

A: Was it twelve? Forty-seven? Both? That's called credit assignment, and it's the core difficulty of long tasks in RL. The simple methods basically blame every step equally. So the thirty-nine fine steps get pushed down along with the one bad one. It still works on average, over lots of runs, but the signal gets noisier the longer the task. And the fixes look just like the agent fixes. Feedback more often. Shorter pieces. And a lot more samples.

B: Did you actually measure any of this?

A: I built the measurement first with a fake agent, one I could set to exactly ninety-five percent per step, just to check the pipeline could get back a number I'd planted. And what surprised me was how noisy end-to-end success is. With ten runs per length, the same fake agent would come out with a fitted horizon anywhere in a range of about a factor of two, just from luck. Whereas counting each step separately is much steadier, because a forty-step task gives you forty step measurements and only one success.

<!-- section: Ending -->

B: Okay, let me say it back. A task is long when there are lots of decisions before any feedback. Small error rates compound, so the length an agent can handle is basically one over its mistake rate. Halve the mistakes, double the length. And because recovery multiplies with accuracy, the way to get there is just to add more checks.

A: Nearly. The last part's where I'd push. It's not more checks, it's better ones. A check that misses half the bugs still lets silent mistakes through at every step, and a weak check the agent trusts can leave you worse off than none. So the order is: make mistakes visible, make the check good, and only then worry about how often you run it.
