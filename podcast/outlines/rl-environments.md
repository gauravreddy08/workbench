# Outline: rl-environments

Source: src/lessons/rl-environments.mdx. Curriculum: "What is an RL environment?" What is an
environment in reinforcement learning, and how do you build one for coding?

## The one big idea

An environment is a practice arena plus a referee, and a model can only learn what its arena
measures. So the arena has to be honest (the answer key out of reach, a score that can't be
faked), repeatable, fast enough to run by the thousand, and pitched at tasks the model sometimes
solves and sometimes doesn't.

## Opening scene

You have a model and a training algorithm, and nothing for the model to practise on. Practice
means: a bug, poke at the code, try a fix, get scored, again, thousands of times per training step,
for weeks.

## Wrong mental models B voices

- "Just reward it for making the tests pass." (it can edit the tests)
- "The environment's the easy part, a wrapper around a test runner."
- "Train on the hardest tasks, that's where the learning is."

## Story beats

1. The scene: what practice demands (clean copy, safe place to run code, unfakeable score, speed).
2. Origin: every early paper had its own simulator; Gym made every world two functions, start
   fresh and take one move. Later the done flag was split in two, because a pole perfectly
   balanced when the clock ran out was being taught as a dead end. For coding: submitting is
   ending; running out of turns is being cut off.
3. The loop: board game with no rulebook. Agent, environment, observation, action, reward,
   episode. The policy is the habit, as probabilities. The environment never learns; it's a
   referee that behaves the same whoever plays.
4. Language model version: the policy is the model; actions are tool calls; the observation keeps
   growing; reward usually once at the end; credit assignment.
5. Visible versus hidden tests: the model can edit anything it can see. Visible tests are a tool,
   hidden tests are the referee. The empty-list case nobody mentioned: testing mind-reading.
6. The sandbox: the model isn't hostile, it's exploring, which is worse, because it will try
   everything. My prototype: an object that claims to equal anything, and a solution that prints
   the runner's own "passed" line, both scored perfect. A test file left in the folder gets read.
7. Measuring instrument: same seed, same world. The check: the untouched start scores zero, the
   reference solution scores full marks, every time. It caught the deliberately broken task.
8. Speed: run one training step's episodes one after another and it's about eleven hours;
   hundreds of sandboxes at once; environments are a distributed system. Measured: submitting was
   about a hundred times slower than resetting, and starting Python was most of it.
9. The signal lives in the middle: comparing a group of attempts teaches nothing if all pass or
   all fail. At a two percent pass rate most groups are empty. Filter, retire solved tasks;
   difficulty belongs to the task and the model together.
10. Contamination, briefly: did it solve it or remember it.

## Numbers said aloud

- "about eleven hours" serial per training step
- "about a hundred times" submit versus reset
- "two percent" pass rate; "most groups teach nothing"

## Left to the written lesson

The reset/step signatures, the CartPole mapping table, the seven parts named one by one, the
Little's law arithmetic, the group-signal formula and figure, sources of tasks, the subprocess and
container flags, all Build It tasks, the Measure table, macOS rlimit quirk, the nondeterminism and
shared-directory Break It items, scaling answer.
