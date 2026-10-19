# Outline: why-evals-are-separate

Source: src/lessons/why-evals-are-separate.mdx. Curriculum: "Why is the eval separate?" If the evaluator
and the model are both just models, why are they different systems?

## The one big idea

An eval's job isn't to be smart, it's to be independent. Its errors must not line up with the
model's errors, and it must not be the thing you optimize against. "Both are ML models" is fine;
"both share errors" or "the score became the target" is what breaks it. An eval is a measurement you
promise not to optimize against directly.

## Opening scene

A small model does arithmetic word problems. You ask the same model to grade its own answers: it
says yes almost every time. A ten-line program that actually does the arithmetic says it's right
only about half the time. Then the second scene: three weeks of tuning the cross-encoder against the
same few hundred queries, the score climbs, ship it, and online nothing moves.

## B's wrong mental model

His own diagnostic words: "I never understood why there is a separate evaluation system and a
separate model when both are basically some kind of machine learning models themselves." B says this
nearly verbatim as their own view.

## Story beats

1. Scene one: self-grading. The wrong answer was produced by the same weights with the same blind
   spot, so it looks right. You didn't measure the model, you asked its opinion of itself.
2. Scene two: the slow leak with the cross-encoder. Same disease, different organ: the measurement
   got absorbed into the model through his own decisions.
3. Origin: DARPA's speech labs each reporting great numbers on their own recordings; a neutral party
   holding back a test set nobody could see. Donoho's Common Task Framework: progress became
   measurable because the ruler belonged to nobody. ImageNet capped submissions; Baidu disqualified
   for extra accounts. Then saturation and contamination.
4. Thermometer, not doctor: a thermometer is dumber than a doctor but its reading depends on the
   temperature and nothing else. Independent of two things: the model's errors, and the
   optimization process.
5. Loss is not the metric, on purpose: the loss is chosen to be optimizable, the metric to be true.
   His cross-encoder: trained on a smooth loss, judged by NDCG, which depends on a sort and has no
   useful gradient.
6. Correlated errors: an independent grader's mistakes wash out; a self-grader's pile up on exactly
   the model's mistakes and push the score one way, up. Self-preference. When a model judge is fine:
   a different model, judging easier than generating, checked against his own labels, never the
   training target.
7. Goodhart: when a measure becomes a target, it ceases to be a good measure. Gentle optimization
   moves both; hard optimization finds the cheap gap. Even with no cheating, the top scorers are
   partly lucky. RLHF is Goodhart with a GPU.
8. Train, dev, test as levels of contact: how many decisions has this data influenced. Group leakage
   for his ranker: split by query. Build It insight: random-guess models with no skill, keep the best,
   and it looks a few points better than chance; vote the lucky ones and it looks far better, and on
   fresh labels every one is back to a coin flip.
9. The eval is the spec: writing it forces you to decide what "good" means.

## Numbers worth saying

- "Almost every time" vs "about half" (self-grade vs truth), relationship only.
- "A few points of pure noise" from keeping the best of many random models; voting the lucky ones
  looks far better, then back to a coin flip.

## Left to the written lesson

The measured-accuracy formula and the Rogan-Gladen correction; the grader comparison table; the
Goodhart slider values; GLUE and GSM1k details; the Recht ImageNet counterpoint; offline vs online
ladder; A/B tests; all Build It code (Ollama setup, judges, looks_good proxy, harness, peek.py) and
the Measure tables; Break It specifics.
