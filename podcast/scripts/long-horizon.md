<!-- section: The Problem -->

A: [relaxed, thinking out loud] So give a coding agent a small job. Rename a config key in one file, fix the one test that uses it. It nails it. Now give it ten of those, one after another, same repo. It nails nine. And on the tenth it's, like, confidently editing a file it already edited. Undoing its own work.

B: Huh.

A: Then you give it a real migration. Forty files, and each change depends on the one before it. It runs for an hour, it reports success... and the test suite fails. Somewhere around file twelve it misread a value, and every file after that was built on the misread. And here's the annoying part. You go through the edits one by one, and every single edit looks reasonable. The whole thing's just wrong.

B: [a bit unsure] I mean, my gut says it got... tired? Like, an hour in, the context is huge, it's getting worse as it goes. The model at file forty is dumber than the model at file one.

A: [gently] That can be part of it, actually, and we'll come back to that, because it's real. But it's not the main thing. The main thing is way more boring. Each step is about as likely to go right as it was at the start. The model didn't get dumber between task one and task forty. What changed is you asked it to be right forty times in a row. With nobody checking in between. And you can put numbers on that, which is kind of the whole point of this episode.

B: Okay.

A: And this is exactly what the Anthropic Code R L job posting means when it says "long-horizon autonomous engineering tasks". Short tasks are mostly solved. The frontier is getting a model to stay correct across hundreds of steps. Which really means three things. Get the per-step error rate down. Get the model to notice and fix its own mistakes. And figure out how to train any of that when the only signal you get comes at the very, very end.

<!-- section: Origin -->

A: [storytelling] And the history here starts with a van. Nineteen eighty-nine, Carnegie Mellon. A researcher named Dean Pomerleau built a system called Alvin, A L V I N N. It was a small neural network that steered a van by watching a human drive. Camera image in, steering angle out. And it learned to copy the human pretty well.

B: So what went wrong?

A: Think about what the training data looked like. A human driver almost never drifts toward the edge of the road. So the network basically never saw what to do when you're already halfway off it. And so when it made a small steering error, it ended up somewhere it had never seen before. Which made it make a bigger error. Which put it further off. And it just... drifted. Pomerleau's fix was kind of clever. He faked it. He synthesised shifted camera images, showing the van off-center, and labelled each one with the correction. Steer back this way. He taught it recovery.

B: [amused] He had to show it what being lost looks like.

A: Yeah, basically. And twenty years later, Stéphane Ross and Drew Bagnell made this precise. The setting is called imitation learning. That's just training something to copy an expert's actions from recorded demonstrations, the way Alvin copied the human driver. And what they showed is, say your copycat makes a mistake with some small chance at each step. You'd naively think the total damage over a task grows with the length. Twice as long, twice as many mistakes. But it can grow with the square of the length. Twice as long, four times the damage.

B: Why the square?

A: [matter-of-fact] Because each mistake moves it into states it's never seen, where it makes more mistakes. The errors breed. That's the two thousand ten paper, and then the follow-up a year later with Geoff Gordon, which gave the fix a name: DAgger. And the exact same worry came back with language models. If every token, or every step, has some chance of going wrong, then a long enough output almost surely goes wrong somewhere. And whether that's fatal depends entirely on recovery. Which is where we're gonna spend most of our time.

<!-- section: The Idea: What a horizon is -->

A: [thinking out loud] So, first, what does "long-horizon" actually mean. Quick scene. You're learning to bake. In one version, a teacher's standing next to you, and the moment you pour the flour, she goes, "too much." In the other version you're alone, and the only feedback is whether the cake tastes good three hours later. Same recipe. Same number of actions. But the second one is way harder to do well, and way harder to learn from. Because when the cake's bad, which of the forty things you did caused it?

B: Yeah, you just know it's bad.

A: Right. Now, an agent's work is a loop. Look at something, decide, act, see what happened, repeat. The full record of one attempt, every observation and every action, in order, is called a trajectory. People also say rollout, or episode, same thing. Each turn of that loop is a step, and for a coding agent a step is usually one tool call. Read a file. Run a command. Write an edit. And the horizon of a task is how many of those steps happen between the start and the moment you find out whether it worked.

B: [skeptical] Hm. I'd have said long-horizon just means long output. Like, lots of tokens. A model writing a huge essay is doing a long-horizon task.

A: [firmly, but friendly] That's the definition I'd push back on, actually. It's not tokens, and it's not wall-clock time either, although both of those tend to go up with it. A model that writes a three-thousand-token essay in one shot has made, really, one decision about one thing. And it's graded once. An agent that makes sixty tool calls and only gets graded when the final test suite runs has a horizon of sixty. Now, the essay can still go wrong in compounding ways, sure. But the things that make long-horizon work hard, keeping track of what you've done across actions, feedback that shows up late, figuring out which step to blame, those are all much weaker for the essay.

B: Okay. So it's decisions between checks.

A: Decisions between checks. That's the one to hold onto. Picture two timelines, one on top of the other. Top one, short horizon. Act, check mark. Act, check mark. Act, X, and right away the next box is "fix", then another check mark. The mistake gets seen one step after it happens. Bottom timeline, forty little boxes in a row, no checks at all, and at the very end one box that says fail. And somewhere back at box twelve there's one box shaded in, that's where the actual mistake was. Found at step forty. And the fail at the end doesn't tell you which of the forty it was.

B: So you've got two problems stacked.

A: Two at once, yeah. More chances to be wrong. And mistakes stay hidden longer. Let's take them one at a time, and start with the arithmetic, because it's... honestly it's more brutal than intuition says.

<!-- section: The Idea: Being right forty times in a row -->

A: So, simplest possible model. The agent gets each step right with some probability, call it p. Any wrong step ruins the task. And the steps are independent, so getting step five right doesn't change the odds for step six. Then the chance of finishing a task of n steps is just p, times p, times p, n times over. That's it. That's the whole model.

A: [relaxed] So, here's one to think about. An agent gets each step right ninety-nine percent of the time. Sounds excellent. What fraction of hundred-step tasks does it finish?

B: [working it out] Okay... so one percent error, a hundred steps... it makes about one mistake per task, on average? So, hm. If I just add up the error, it's a hundred times one percent, which is a hundred percent, which can't be right, it's not failing every time. So... I don't know, somewhere in the high eighties? It's ninety-nine percent reliable.

A: [calmly] About thirty-seven percent.

B: [surprised] Thirty-seven?

A: Thirty-seven. A "ninety-nine percent reliable" agent fails most hundred-step tasks. And your adding-it-up instinct was almost onto something. You're right that it makes about one mistake per task on average. But the question is whether it makes zero, and with an average of one, the chance of zero is only about a third. Multiply point nine nine by itself a hundred times and you get point three seven, roughly.

B: Okay, that's... that's not intuitive at all.

A: No. And the next question is, at what length does it drop to a coin flip? Fifty percent. For ninety-nine percent per step, it's about sixty-nine steps. And there's a shortcut that's really worth having in your head. When p is close to one, the coin-flip length is about point six nine divided by the failure rate. And by failure rate I just mean the chance a single step goes wrong. One minus p. So ninety-nine percent per step is a one percent failure rate, and point six nine divided by one hundredth is sixty-nine steps. One mistake per thousand steps, a tenth of a percent, gives you about six hundred ninety-three. When I checked all of these in Python, the shortcut was right on.

B: And where's the point six nine from?

A: It's the natural log of two. Same number that shows up in half-lives. Hold onto that, it's coming back. But the reason the shortcut matters is what it says about scaling. The length an agent can handle is inversely proportional to its failure rate. Halve the failure rate, double the length. So going from ninety-eight percent per step to ninety-nine percent sounds like a rounding error, right? One point. It doubles how long a task the agent can do. Going from ninety-nine to ninety-nine point nine multiplies it by ten.

B: [amused] So that last decimal place is worth ten times the task length.

A: Yeah, pretty much. Let me give you a few landmarks so you've got a feel for it. At ninety percent per step, a ten-step task succeeds about thirty-five percent of the time, a hundred-step task basically never, and the coin-flip length is about seven steps. At ninety-five percent, ten steps works sixty percent of the time, a hundred steps works six tenths of one percent of the time, and the coin flip is around fourteen steps. At ninety-eight, it's eighty-two percent at ten steps, thirteen percent at a hundred, coin flip around thirty-four. Ninety-nine, you've heard: ninety at ten, thirty-seven at a hundred, sixty-nine. And at ninety-nine point nine, you finally get ninety percent success at a hundred steps, and the coin flip is out near seven hundred.

B: So even the ninety-nine point nine agent fails one in ten of the hundred-step ones.

A: One in ten. And that's why the gap between "a demo that works" and "a system that works" is so huge for agents. A demo's usually one short run. Reliability across many steps is a different number. A much harder one.

B: You said half-lives earlier.

A: Yeah, so this curve has a name in other fields. If there's a constant chance of failing at every step, that's called a constant hazard rate. Hazard rate just means the chance of failing in the next step, given you haven't failed yet. And when it's constant, survival decays exponentially. Same as radioactive decay. So your agent literally has a half-life. The number of steps after which half your runs have failed. And it's the same formula as for an atom: natural log of two over the failure rate. Which is that point six nine shortcut again.

B: Huh. So a ninety-nine percent agent is, like, an isotope with a half-life of sixty-nine steps.

A: [laughs] That's actually a pretty good way to say it. And keep it in mind, because when we get to how people measure frontier models, it comes right back.

<!-- section: The Idea: Twenty-four agents -->

A: Now, to really feel this, picture a little grid. Twenty-four rows, each row is one simulated agent doing the same task, and each square in the row is one step. You've got a slider for p, buttons for ten, twenty or forty steps, and a resample button. Plain square, the step went right. The first time a step goes wrong, that square lights up orange, and with no recovery, that run's dead. Every square after it goes grey.

B: Grey meaning it's still running?

A: Still running. That's the point. So set it to ninety-five percent and forty steps. There's a readout that says what fraction of all the steps were right, and it says about ninety-five percent. Of course it does. And then you look at how many runs finished... and it's a few. Out of twenty-four. Like three.

B: [skeptical] Wait, ninety-five percent of the steps are fine and almost nobody finishes?

A: That's the thing. Per-step accuracy and end-to-end success are wildly different numbers. So if someone quotes you one of them, ask for the other. And then look at the grey. Every grey square is a step the agent actually took. Tokens you paid for. That could never, ever lead to success. And on long tasks the expensive failure isn't the run that crashes at step three. It's the run that makes a quiet mistake at step twelve and keeps going, very confidently, all the way to step forty.

<!-- section: The Idea: Recovery -->

B: Okay, but now I'm confused. If it's really this brutal, how does anything work? Agents do finish tasks with, like, a hundred-plus tool calls. And no model is getting hard steps right ninety-nine point nine percent of the time.

A: [pleased] Right, and that's the contradiction that tells you the model's missing something. If p to the n were the whole story, agents would be hopeless. The missing piece is that a mistake isn't always fatal. Watch a good engineer work. They mistype a path, the command fails, they fix it. That mistake cost one step. They write a function with an off-by-one bug, the test fails, they fix it. That cost a few steps. Only some mistakes actually kill a project. The ones nobody notices until it's too late, and the ones you can't undo.

B: So the mistake isn't the problem, it's whether you find out.

A: Pretty much. Picture one wrong step, at some step k, and three arrows coming out of it. Top arrow: loud, right away. The command errors, file not found, you fix it on the next step. Cost, one step. Middle arrow: caught later. A test fails six steps on, you go back, find it, redo. Cost, some rework. Bottom arrow: silent, or irreversible. Nothing checks it, or it can't be undone. Cost, the whole run. And which arrow you go down depends on how soon the mistake becomes visible and whether the action can be undone. Not on how big the mistake was.

B: So a tiny typo can kill you if it's silent, and a big blunder's fine if it blows up loudly.

A: Yeah. So now you split each step into two questions. Did it go right? That's still p. And if it went wrong, does the agent notice and fix it before it matters? Call that r, for recovery. Recovery meaning, you know, re-reading the file, seeing the error message, re-running the test. And a step only ruins the task if it goes wrong and isn't recovered. So the chance a step is fatal is the failure rate times the fraction you don't recover. Say a five percent failure rate and you recover half. Then only two and a half percent of steps are fatal. Which means your effective per-step success is ninety-seven and a half percent, and you plug that into the same p to the n math as before.

B: So it's the same curve, just a gentler slope.

A: Same curve, smaller hazard. Still a constant chance of dying each step, just a smaller one. And look at what that does to the half-life. It's point six nine over the fatal rate, and the fatal rate is failure times non-recovery. Those two multiply. So an agent that recovers from half its mistakes has exactly the same horizon as one that makes half as many mistakes.

B: Oh. That's kind of a big deal for training.

A: It's a big deal. You can get longer horizons by making the model more careful, or by making it better at noticing and fixing. And the second one might be easier. So try this. Agent A gets ninety-seven and a half percent of steps right and never recovers. Agent B gets only ninety-five percent right, but notices and fixes half its mistakes. Which one has the longer horizon?

B: [working it out] Well, I just did B. Five percent times a half... two and a half percent fatal. And A is two and a half percent fatal too. So... they're the same?

A: [nodding along] They're the same. Both are effectively ninety-seven and a half percent, both hit the coin flip around twenty-seven steps. On paper. But they're not the same agent in practice. B uses more steps, because every recovered mistake costs at least one extra step. And B's whole advantage depends on its mistakes being detectable. Put B somewhere errors are silent, no error messages, no tests, and its recovery rate collapses toward zero, and its horizon halves. A doesn't care. A's robust to that.

B: So the same model could look great in one setup and bad in another.

A: And that's one reason the same model scores really differently on different harnesses. The harness decides how loud the mistakes are.

<!-- section: The Idea: Verification -->

A: Which leads to the obvious engineering move. If recovery only works when the mistake shows up somewhere the agent can see it, then make mistakes visible on purpose. Run the tests after every edit. Type-check after every file. Diff the output against what you expected. Anything that checks the agent's work and reports pass or fail is called a verifier. Test suite, type checker, linter, a little script that compares the output to a known answer. And a verifier turns a silent mistake, the bottom arrow, into a caught-later one, the middle arrow.

A: So here's the model for it. Every k steps you run a check. If that last block of k steps has a fatal mistake in it, the check catches it with some probability. Call that c, the catch rate. It's just the fraction of real bugs the verifier actually detects. A test suite with a sixty percent catch rate misses four bugs in ten. If you've done ranking metrics, it's basically recall. If it catches the bug, the agent throws the block away and redoes it, up to three attempts. If the check misses it, the bug's silent, and the run's doomed.

B: How do you get a success rate out of that?

A: You think about one block. It passes if it's clean the first time. Or it's bad, gets caught, and the retry's clean. Or bad, caught, bad, caught, and the third try's clean. Add those three paths up and that's the chance one block gets through. Then the whole task is that, multiplied once for every block. And when I checked that closed form against a brute-force simulation in Python, ninety-five percent per step, a check every five steps, a catch rate of nine tenths, forty steps, the formula said seventy-four point two percent, and forty thousand simulated runs gave seventy-four point four.

B: Okay, so the formula's trustworthy.

A: So here's the one I like. Ninety-five percent per step, no recovery, forty steps. With no checks at all, you finish about thirteen percent of the time. Now run a check after every single step, up to three tries per step. What's your success rate if the check is perfect? And then, what if the check only catches half the bugs?

B: [thinking out loud] Perfect check... each step basically has to fail three times in a row to kill you. So, really high. Ninety-nine-ish. And the half one, I mean, you're checking every single step, so even if it misses half the time, it gets so many chances. Ninety?

A: [slowly] First one, yeah. About ninety-nine and a half percent. Each step only fails if all three tries are wrong, and five percent, three times over, is about one in ten thousand. Over forty steps that barely dents you. The half-catch one, though... about thirty-five percent.

B: [taken aback] Thirty-five? From ninety-nine and a half?

A: [jumping in] Yeah, and the "it gets so many chances" thing is exactly backwards. Every time a bug slips past the check, that's a silent fatal mistake. And you get a fresh chance of one at every single step. So checking more often with a weak verifier mostly buys you more chances to be fooled. It's better than thirteen percent, sure. But nowhere near ninety-nine.

B: So the quality of the check matters way more than how often you run it.

A: Verifier quality beats verifier frequency. And that's the whole reason writing good checks, checks that can't be gamed, is its own deep topic.

A: Now picture all of this on one chart. Probability of finishing on the vertical axis, number of steps along the bottom on a log scale. Three curves. A dashed one, that's plain p to the n. A thin one with recovery. And a bold blue one, with verification every k steps. Each curve has a dot where it crosses fifty percent, and there's a readout for each of those horizons, plus one for cost. How much work you do per finished step, because checks and redos aren't free. They cost steps, tokens, and wall time, and more of all three if your test suite is slow. And you've got sliders for p, for r, for how often you verify, and for the catch rate.

B: What do you do with it?

A: Few things worth finding. Set p to ninety-nine, nothing else. Horizon about sixty-nine. Drag it to ninety-eight. About thirty-four. One point of per-step accuracy, half the task length. Then set p down to ninety percent, and recovery to eight tenths. The horizon jumps from about seven to about thirty-four. Same as the ninety-eight percent agent with no recovery.

B: So a sloppy agent that catches its mistakes matches a careful one that doesn't.

A: Right. Then turn verification on, every step, catch rate one. The blue curve just runs off the right edge. Then slide the catch rate down to a half and watch most of that gain disappear. And last one, set verification to every twenty steps. Now the blocks are so long that most of them have a bug in them somewhere, so the agent keeps redoing big chunks of work, and it often runs out of attempts. Checking rarely is cheap per check. And really expensive per mistake.

<!-- section: The Idea: What METR measured -->

A: [shifting gears] Okay. Everything so far counts in steps. Which is natural if you're building a harness. But steps aren't comparable across tasks. One step of "write a regex" and one step of "design the database schema" are not the same size. And there's a nonprofit called Meter, spelled M E T R, that evaluates frontier AI systems, and they wanted one number that means the same thing across really different tasks. And their answer was: measure tasks in human time.

B: Human time like how long it takes a person?

A: Yeah, how long a person takes. The paper is by Thomas Kwa and colleagues, twenty twenty-five, "Measuring AI Ability to Complete Long Tasks". It got retitled later to say "long software tasks", and it was at NeurIPS that year. And what they did, roughly. They collected about a hundred seventy software and research-engineering tasks, from three suites. One called H CAST, one called R E Bench, and a set of sixty-six new, really short tasks called S W A A. Ranging from a few seconds of work up to many hours. Then they paid skilled humans to do the tasks and timed them. So every task gets a length in human minutes.

A: Then they ran a whole lineup of AI models through the same tasks, in an agent harness, from GPT two in twenty nineteen up to models from early twenty twenty-five, and recorded pass or fail. And for each model they fit an S-shaped curve. A logistic curve, it's called. It goes smoothly from near one down to near zero. Chance of success on the vertical, and the log of the human task time along the bottom. And the model's fifty percent time horizon is the human task length where that curve crosses fifty percent.

B: So, like, every task is a dot?

A: Every task's a dot. Picture it. Short tasks on the left, long ones on the right, log scale, so one minute, ten minutes, an hour, eight hours. Passes are dots up at the top, fails are dots down at the bottom. Mostly passes on the left, mostly fails on the right, a messy mix in the middle. You draw the S-curve through them, and where it crosses halfway, that's the horizon. And there's a second line, further left, at eighty percent. Same idea, stricter bar. And it's a lot shorter.

A: And the headline, the way the paper puts it. The frontier models of early twenty twenty-five, Claude three point seven Sonnet was the top one, had a fifty percent time horizon of around fifty minutes on these tasks. And the fifty percent horizon of the best model has doubled roughly every seven months since twenty nineteen. Maybe faster in twenty twenty-four. The eighty percent horizon is several times shorter. And they say the gains seem to come mostly from greater reliability, and a better ability to adapt to mistakes.

B: Which is p and r.

A: Which is just p and r. Yeah.

B: [a bit unsure] So, okay, the best model can work on its own for about fifty minutes.

A: [gently] And that's the reading everybody falls into, and it's not what it says. It says: on tasks that take a skilled human about fifty minutes, the model succeeds about half the time. The model itself might take five minutes. Or two hours. It's measured in human time, not the model's time.

B: Oh. Okay, that's different.

A: Pretty different. And there's a few more ways to over-read it. It's tied to the task suite. These are well-specified, automatically scored, mostly self-contained software tasks. Messy real-world work with fuzzy goals scores worse, and the authors talk about that themselves, they call it external validity. Second, "doubling every seven months" is a trend line. Fit through a few dozen models over six years. It's a measurement, not a law of nature. If you extrapolate it, you're making a forecast, with all the usual risks. And third, fifty percent is a low bar. For anything you'd actually hand off and walk away from, you care about the eighty percent horizon, or the ninety-nine, and those are much shorter.

B: And where does the half-life thing come back?

A: Right here. Toby Ord, also twenty twenty-five, wrote a short paper called "Is there a half-life for the success rates of AI agents?" He reanalysed Meter's data, and it fits really well with exactly the constant-hazard model from before. Except instead of a constant chance of failing per step, it's a constant chance of failing per minute of human task time. So success decays exponentially with task length, and every model has its own half-life. And under that model, "the horizon doubles every seven months" is the exact same statement as "the per-minute failure rate halves every seven months."

B: [working it out] Because horizon is point six nine over the failure rate. Halve the rate, double the horizon.

A: That's it. Now, Meter's own fit is the S-curve on log time, not an exponential, and the S-curve decays more slowly at long lengths than an exponential does. They look alike in the middle and come apart in the tail. And when you build your own harness, you'll fit both to your own data and see which one your agent looks like.

<!-- section: The Idea: What makes long tasks hard -->

A: So, the p to the n math treats every step as an independent coin flip. Real long tasks are worse than that, in ways coin flips don't capture. And each of these is a real research problem on its own.

A: First, state tracking. The agent has to remember what it's done and what's still true. Which files did I edit? Did I already rename that function? What was the value in file twelve? Humans offload a lot of this. To the codebase, to notes, to git status. An agent has to either keep it all in context or re-derive it. And mistakes here are that "edited the same file twice" failure from the start. And notice what it does to the math. The per-step error rate goes up as the task goes on, because there's more to keep straight. So that's the constant-p assumption breaking. In the bad direction.

B: So that's my "it got tired" thing.

A: That's your "it got tired" thing, yeah. It's real, it's just not the whole story. Second one is related. Context limits. The context window is the most text the model can see at once. The system prompt, the conversation so far, all the tool output. And every step adds tool output. A two-hundred-step trajectory can easily run right past it. And even before it's full, the fact from step twelve is buried under a hundred fifty steps of logs. So something has to summarise, or drop, or go back and retrieve old content. And every summary can lose the one detail that mattered. That's a whole topic on its own, managing context.

A: Third, sparse and delayed feedback. On short tasks you hear back right away. On long ones, you might not know if step twelve was right until step forty runs the tests. That's the bottom timeline from before. And it's exactly what makes recovery hard. r is high for mistakes that cause an immediate error, and near zero for mistakes that only show up much later.

A: Fourth, planning. A long task needs a plan. What to do first, what depends on what, when is a subgoal actually done. And a bad plan can make every individual step correct and the whole task wrong. Good agents, and good engineers, split a long task into chunks that can each be checked. Which is just "verify every k steps" again, except the agent's doing it to itself.

A: Fifth, verification and self-correction. The agent needs to check its own work, and then believe the check. And there are two ways that goes wrong. Not checking at all, which is low r. Or checking, but trusting a weak check, which is low c. And the second one's worse, because it feels safe.

B: [skeptical] Like an agent that writes a test that always passes and then says it's done.

A: [grimly amused] That's the long-horizon version of it, yeah. And sixth, irreversible actions. Some steps you can't take back. Dropping a database table. Sending an email. A force push in git. Deleting a file nobody backed up. For those, r is zero by definition. Doesn't matter how smart the agent is. So a good harness makes those rare. Sandboxes, dry runs, version control, asking first. Which is really a way of raising r from the outside.

<!-- section: The Idea: Why long tasks are hard to learn -->

A: Now, there's a training side to this, which is really the "Code R L" part of that job title. In reinforcement learning, an agent tries tasks and gets a reward. A reward's just a number the environment hands back to say how well it did, and for a coding task it's often one if the tests pass and zero if they don't. And the training algorithm nudges the model to make rewarded actions more likely, and unrewarded ones less likely.

A: For a three-step task with a reward at the end, it's fairly clear which steps to credit. For a sixty-step task with one pass or fail at the very end... it's not. Did it fail because of step twelve? Step forty-seven? Both? Working out which of many earlier actions deserve the blame, or the credit, for a reward that shows up later, that's called credit assignment. And it's the core difficulty of long-horizon R L.

A: Picture forty boxes in a row, one per step, with box four shaded. That's the actual bug. And at the end, one reward box that says zero, fail. And then a dashed arrow from that reward sweeping back over every single box. Because the simplest methods give every step the same share of the blame. So the thirty-nine fine steps get pushed down right along with the one bad one. All the signal really says is "something in here was bad."

B: [a bit unsure] But over enough runs it'd figure it out, right? Like, step four is bad in every failed run, so it averages out. It just learns a bit slower on longer tasks.

A: [thinking it through] Over enough runs, yes. It does work, on average. But "a bit slower" undersells it. The reward is one number, and it's a verdict on the whole trajectory. So each step's contribution is buried under the randomness of all the other steps. The longer the trajectory, the more other steps there are making noise, and the noisier the signal for any one step. So you need a lot more samples to learn the same thing. And there's a second problem on top. Rewards get rarer. If the model's success on long tasks is near zero, almost every trajectory comes back with reward zero. And there's not much to learn from a pile of zeros.

B: So you can't learn from a task you never pass.

A: Basically. And the algorithm names you've heard, Reinforce, P P O, G R P O, they differ in how they try to cut that noise. P P O learns a separate estimate of how good each situation is, a value estimate, and compares against that. G R P O has the model attempt the same task a bunch of times and compares each attempt against the group. But none of them gets to know which step was the bug. So the practical levers are the same ones we've been talking about, just seen from the training side. Denser feedback, so intermediate rewards, tests that run partway, partial credit that can't be gamed. Shorter effective horizons, by breaking tasks up, or starting with short tasks and making them longer as the model improves, which is called a curriculum. Good verifiers, so the reward's actually right. And lots more samples.

<!-- section: The Idea: Benchmarks -->

A: Quick word on benchmarks, since you'll see these cited everywhere. S W E bench, from Carlos Jimenez and colleagues, twenty twenty-three, it was at I C L R the next year. Two thousand two hundred ninety-four real GitHub issues from twelve popular Python repos. The agent has to produce a patch that makes the hidden tests from the real fix pass. And there's S W E bench Verified, from twenty twenty-four, a five-hundred-task subset that humans checked for being solvable and fairly tested. That's the one most people quote. These tasks usually take an agent tens of tool calls. Then there's Meter's own suites, H CAST and R E Bench, picked to span seconds to many hours of human time.

A: And tau bench, from Shunyu Yao and others at a company called Sierra, twenty twenty-four. Agents talk to a simulated customer and call tools, in domains like airline and retail customer service. And the nice thing it introduced is a metric called pass hat k. The chance that all k independent attempts at the same task succeed.

B: So it's the same multiplying-together thing, but across attempts instead of steps.

A: Same math. Reliability across runs instead of across steps. And it shows really fast how "usually works" decays into "can't be trusted alone." And one caution: benchmark numbers move fast, and they depend a lot on the scaffold, the harness around the model. So for current scores, check the benchmark's own leaderboard. Don't trust a number somebody wrote down months ago.

<!-- section: Build It -->

A: Okay, so here's what you'd build. Three pieces. A task suite where you control the length. A little agent harness that runs a real model through it. And an analysis script that fits all these curves to your own data. And then you add a verifier and see whether the curve actually moves the way the sliders said it would.

A: The task is a dependency chain of config files. It's a toy, but it's got the shape of a real migration. Each step, the agent has to read something, compute something from what it found earlier, and write it down. And an early mistake poisons everything after it. So, a folder of n small Python files. The first file has a known value. Every other file has a rule in a comment saying how to compute its value from earlier files, and a placeholder that says none. So file seven might say: my value is file six's value times three, plus the length of the name in file four, and then keep just the remainder after dividing by a thousand, so it stays under a thousand. And then the name in file seven is "pelican", and its value is blank. The agent has to fill in every value.

B: And file four is three files back, so it has to remember stuff.

A: That's the point. Rules point back a few files, so it has to track state across the whole task. Setup's just a folder, a virtual environment, the Anthropic SDK plus numpy, scipy and matplotlib, and an API key you never commit. And use a small, cheap model. You want it to make mistakes at twenty to forty steps. A frontier model might be so reliable on these toy rules that you'd have to make them harder, more back-references, string operations, before you see any failures.

A: And do the budget first. Each step is about two model calls, a read and then a write. And every call resends the whole conversation so far.

B: [jumping in] Wait, so the cost isn't linear in the number of steps.

A: [nodding] No, it grows with the square. Each call adds maybe a hundred fifty tokens of context, and each call resends everything before it. So a five-step task is about fifteen thousand input tokens. A forty-step task is about five hundred forty thousand. A full sweep, lengths five, ten, twenty and forty, ten tasks each, comes to about eight million input tokens, and the verifier run roughly doubles that. Multiply by whatever your model costs right now. Prompt caching cuts the cost of all that resent context a lot. And put a hard token cap in the harness, so a stuck agent can't burn your budget.

A: Then the generator and the grader, and this part's yours to write. Seed a random generator so every task is reproducible. Have the back-reference point two to five files back about half the time. And the grader is where the real thinking is, because there are two kinds of correct. Global correctness asks: is this file's value the true one? And one mistake at file twelve makes files twelve through thirty-nine globally wrong. Even if the agent did every later computation perfectly from the wrong input.

B: So global just tells you where it went off the rails, and then everything's red after.

A: Right. Local correctness is the other one. It asks: given what the agent itself wrote in the earlier files, did it compute this one correctly? That isolates each step. And the fraction of locally correct steps is your measured per-step reliability. Call it p hat, hat meaning "measured". That's the number the whole model hangs on, so get that function right. Unit-test it on a hand-made wrong answer before you trust it.

A: Then the harness. It's a loop. Send the conversation and the tool list to the model, run whatever tool it asks for, append the result, repeat. Until it says it's done, or hits a max step count, or hits the token cap. Four tools: list the files, read a file, write a file, and done. Refuse any path that tries to escape the task folder. Log every call and result to a trace file. And keep the model behind a tiny interface, something that takes the messages and the tools and hands back a tool name and arguments, so you can swap it out. For the actual request format, follow your SDK's tool-use docs.

A: And then, before you spend a single cent, write a fake agent. Same interface. It walks the files in order, reads each one, and writes the correct value with probability p, otherwise a wrong one. Run two hundred fake episodes at ninety-five percent for each length. Does your grader's p hat come out near ninety-five? Does end-to-end success follow ninety-five percent to the n?

B: [amused] Testing the thermometer before you trust the fever.

A: Yeah. If your measurement pipeline can't recover a number you planted, it's definitely not gonna recover one you didn't. Then the real sweep. Lengths five, ten, twenty, forty, ten tasks per length, different seeds. Plain system prompt: here's what the files are, here's what the tools do, fill in every value, then call done. No hints about checking your work yet. Save one line per episode with the length, the seed, success, the local and global lists, steps used, tokens used, and why it stopped. And count recoveries: files where the first write was locally wrong but the final value is locally right. The model went back and fixed it. You find those in the trace.

A: Then have an agent review the harness for anything that makes the comparison unfair. Tasks that get harder as they get longer. A max step count that's too tight for forty. The token cap cutting off long runs, which is a failure, but a different kind, so record it separately. API retries that silently change the trajectory.

A: Then fit. One version, find the single per-step number that best explains your end-to-end success at every length. That's a fitted q hat. Another, the Meter-style S-curve on the log of the length, which gives you its own coin-flip length. And then compare four things. The measured local p hat. The fitted q hat. The prediction you get from p hat alone, multiplied out, no fitting at all. And the measured recovery rate, recoveries divided by wrong first writes, with the recovery-aware prediction that goes with it. The question you're answering is: can you predict long-task success from short-task step reliability? Plot it all, measured success with error bars, every curve on top.

A: Last piece, the verifier. Add a check tool that reports which files written so far break their rule, given the earlier written values. So it reports local errors. And give it a catch-rate setting, where each broken file only gets reported with that probability, so you can make it imperfect on purpose. Change the prompt to "call check after every few files and fix anything it reports." Run it with a perfect catch rate, then with half at twenty and forty steps, and measure success, steps and tokens. And before you run it, use the sliders to predict how the curve should move.

B: And how do you know you're done?

A: The fake agent at ninety-five gives a p hat within about one point of ninety-five over two hundred episodes, and its success tracks the prediction. You've got real results for four lengths, ten tasks each, with and without the verifier, and the plot. And you can say, with a number, how well p hat to the n predicted long-task success, and whether recovery explains the gap. And what the verifier cost you in steps and tokens, and what it bought you in horizon.

<!-- section: Measure -->

A: And when you measure, fill everything in from the trace files. Not from your memory of watching runs. But first, error bars, because with these sample sizes they're huge. The standard error is how much a measured average would jump around if you reran the whole experiment. For a success rate it's roughly the square root of p times one minus p, divided by the number of runs. So say you're near fifty percent with ten runs. Half times half is a quarter, divided by ten is a fortieth, and the square root of that is about point one six.

B: [surprised] Sixteen points? Each way?

A: Each way, and you go out about two of those for a real range. So "fifty percent" really means somewhere from about twenty to eighty. Don't read anything into a ten-point difference. And I simulated this with the fake agent. True per-step success of ninety-five percent, ten runs per length, and fit q hat from end-to-end success. Across repeats, ninety percent of the time it landed anywhere from point nine three one to point nine six five. Which is a coin-flip length of anywhere from ten to nineteen and a half steps. From the exact same agent. With thirty runs per length it tightens to point nine four to point nine six.

B: [working it out] Oh, so that's why you want the per-step number. A forty-step task is one success measurement, but it's forty step measurements.

A: [warmly] That's why p hat is so useful. Now, I can't run your model for you, so here's the shapes to expect, not the values. p hat should be roughly the same at every length if the steps really are independent. If it falls as the length grows, that's state tracking or context getting worse over the run. The constant-p assumption's breaking, and plain p to the n will be too optimistic at long lengths.

A: If the fitted q hat comes out higher than p hat, the agent's recovering. Your recovery rate should explain most of that gap. If the recovery-aware curve still comes in low, go look in the traces for recoveries your counter missed. Like the model rewriting a file after re-reading an earlier one. If q hat comes out lower than p hat, something's killing runs that isn't a wrong value. The token cap, the step limit, the agent calling done early, or skipping a file. Those are failures too. And honestly they're often the main long-horizon failure in practice. Count them separately.

A: With the perfect verifier, success at forty steps should go up a lot, and steps and tokens go up too. With the half-catch one, expect only part of the gain, like that thirteen to thirty-five example. And if the perfect verifier barely helps, check whether the model actually called check. Models skip optional tools all the time. Last thing: the S-curve and the exponential will look really similar from five to forty steps. Where they differ is the tail. If you've got budget, a few runs at eighty steps would tell them apart.

<!-- section: Break It -->

A: Then break it, on purpose. First one: make mistakes silent. When the agent reads a file it's already written to, strip out the rule comment. So re-reading can't reveal the mistake.

B: Then recovery goes to zero.

A: Toward zero, and success falls toward plain p hat to the n. Same model, same p. Shorter horizon, just because the environment stopped making errors visible. That's the agent B thing from before. Second: starve the context. Only keep the last six tool results in the conversation, drop the older ones. Now a rule that references a file five back needs a re-read the agent may not think to do. Watch p hat fall specifically on the back-reference steps, and fall more at longer lengths. That breaks the independent-steps assumption in exactly the direction you'd expect, and it's the bridge to managing context.

A: Third: add one irreversible action. Give it a delete tool, and put a rule in one file that says "if this value is even, delete file three." Any run that deletes the wrong file can't finish, because the value it needs is gone. Count how often that happens. Then add a git-style undo, keep a backup and give it an undo tool, and watch r for that step jump.

B: So "safe harness" mostly means making the r-equals-zero steps not zero anymore.

A: Most of what makes a harness safe is exactly that. And fourth, game your own verifier. Change check so it only reports on the last file written. Now the agent can pass every single check while building on a wrong value from way earlier. And success can drop below even the no-verifier case, if the model trusts the check and stops re-reading.

B: [skeptical] Worse than no check at all?

A: [serious] Worse than none. A weak verifier the agent believes is worse than no verifier. Which is the whole worry behind rewards and verifiers.

<!-- section: Connections and close -->

A: And this connects to a bunch of things. Managing context goes after one cause of per-step reliability sliding over a long run. Turning your task suite into an R L environment is how a model actually trains on this. R L with verifiable rewards, G R P O, is where credit assignment stops being a picture and becomes a loss function. And the agent harness side, sandboxes, undo, checkpoints, is all ways of raising r from outside the model. If you read just two things, read the Meter paper, the methods and limitations parts, not just the headline plot, and Toby Ord's half-life paper, which is short and is the cleanest link between their data and this math.

B: [working it out] Okay, let me try the whole thing. Long-horizon means lots of steps before you get checked. Each step has some small chance of going wrong, and those chances multiply, so ninety-nine percent per step only gets you about a third of hundred-step tasks. And the fix is checking more often, so you catch the mistakes.

A: [gently] Most of that, yeah. The multiplying, the thirty-seven percent, sixty-nine steps for a coin flip, all right. But the fix isn't "check more often." It's that only fatal mistakes count, and a mistake's fatal if nobody catches it or it can't be undone. So the horizon is about seven tenths over the fatal rate, and you shrink the fatal rate by making fewer mistakes, by noticing more of them, or by making them loud with a verifier that actually catches them. Checking more often with a weak check just gives you more chances to be fooled. A good check beats a frequent one.
