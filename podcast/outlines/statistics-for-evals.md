# Outline: statistics-for-evals

Source: src/lessons/statistics-for-evals.mdx. Curriculum: "Is that improvement real?" When a score goes
from seventy-one point two to seventy-two, is that real or noise?

## The one big idea

An eval score isn't a fact about the model; it's a measurement from a sample of questions, and it has
an error bar much wider than intuition says. Two models compared on the same questions should be
compared question by question, because only the questions where they disagree carry any signal. That
paired view turns "can't tell" into a real answer, and it also tells you before you start how many
questions you'd need.

## Opening scene

New hard-negative sampler for the cross-encoder. Top-one accuracy goes from seventy-one point two to
seventy-two on five hundred queries. Slack: "nice, is that significant?" He doesn't know what the
question means. He reruns the old model with a little randomness in its query rewrites, and the same
model moves more than the "improvement" between two runs.

## B's wrong mental model

Two natural ones the text calls out as common: the gut says the error bar on five hundred questions is
about a point (most people underestimate by three or four times); and "the two error bars overlap, so
there's no difference." A corrects both.

## Story beats

1. The scene: the improvement is smaller than the wobble of a model against itself.
2. Origin: Gosset at Guinness, small expensive experiments, published as "Student". His example: two
   sleeping drugs on the same ten patients; he looked at the per-patient difference. A paired
   comparison. Miller's error-bars paper for Anthropic is largely a reminder of that century-old idea.
3. A score is a sample: the questions are a draw from all the questions of that kind. Each question
   is a coin; the score is an average of coins. The error bar on five hundred is about four points
   either side; halving it takes four times the questions.
4. Two models, one set: most questions are easy for both or hard for both and say nothing. Only
   disagreements carry the signal. Compare per question; the shared part cancels. Overlapping bars
   don't mean no difference.
5. The bootstrap: can't draw new question sets from the world, so draw them from your own, with
   replacement. Works for any metric. For a gap, resample questions once and score both models on
   them.
6. Is it luck: shuffle which model is which on each question and see how often luck makes a gap this
   big. McNemar's test as the right-or-wrong version that looks only at disagreements. Build It
   insight: two identical models on five hundred questions, and one beats the other by that Slack
   message's margin about a third of the time.
7. How evals fool you anyway: questions in clumps (fewer independent questions than you think);
   picking the best of many tries (the winner's curse); seeds (the training run is a sample too).
8. Power: before running, ask how likely you'd be to see a real improvement of the size you care
   about. With five hundred questions, a real small gain is usually missed. Halving the effect you
   want quadruples the questions.

## Numbers worth saying

- "Seventy-one point two to seventy-two" (the title).
- "About four points either side" on five hundred questions.
- "Four times the questions to halve it."
- "About a third of the time" (identical models showing that gap).

## Left to the written lesson

The standard error formula and its table; the variance-of-a-difference algebra; the fake-data
intervals; sign test vs McNemar arithmetic; p-value definitions in detail; the two-noise variance
split and sampling several answers; pass at k and its estimator; the design-effect formula and
clustered SE; Bonferroni; the power formula and sample sizes; the result-statement template; all
code, Measure numbers and Break It specifics.
