<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you've just retrained the cross-encoder. New ranker. And you want to know if it's actually better than the old one. Problem is, you don't have relevance labels for this week's queries. So you do what basically everyone does. You take five hundred queries, you grab the top result from each ranker, and you hand both to a strong model with a little prompt. "Here's a query and two search results. Which one is more relevant? Answer A or B." And the new ranker wins sixty-four percent of the time.

B: I mean... ship it? Sixty-four is a pretty clear win. That's not a coin flip.

A: [dry] That's what I'd have said. Then, just out of curiosity, you rerun the exact same five hundred comparisons, but you swap the order. So now the old ranker's result is shown first. And now the old ranker wins fifty-eight percent of the time.

B: [skeptical] Wait. Same results, same queries?

A: Same everything. Nothing about the results changed. Only which one sat on top in the prompt. And then you notice something else. The new ranker tends to surface longer pages, with longer snippets. So you trim every snippet down to forty words and run it again. And the new ranker's win rate drops to fifty-one percent.

B: [working it out] So the sixty-four was... some of it was relevance, some of it was "I liked whichever came first", and some of it was "I liked the one with more words".

A: Yeah. And here's the part that actually hurts. You can't say how much of each. Because you never checked the judge against anything. You used it like a ruler, without ever asking if the ruler was straight. And that's the whole topic, really. A model grading another model is genuinely useful. It's cheap, it never gets tired, it can grade things no regex ever could. But it's a measuring instrument. And instruments have to be checked against a known reference before you trust a reading. And the reference here is... you. With about a hundred careful labels.

<!-- section: Origin -->

A: The way this became a whole practice is kind of interesting. By early twenty twenty-three, chat models had gotten good enough that the old automatic metrics just stopped meaning anything. The famous one is BLEU, from two thousand two, built for machine translation. It counts how many short runs of words in the output also show up in a reference translation. Cheap, fast, and it rewards copying the reference's wording, not being right. And a great chat answer can share almost no words with the reference answer and still be perfect.

B: So that metric just says it's bad.

A: [laughs] Says it's bad, yeah. So the gold standard was people. Human raters. Slow and expensive. A few dollars and a few minutes per comparison. And meanwhile people had started, kind of quietly, using GPT four to grade other models. Then in June twenty twenty-three, Lianmin Zheng and colleagues at L M Sys, that's the group behind Vicuna and Chatbot Arena, put out a paper called "Judging L L M as a Judge". And it did two things. It named the practice, and, more importantly, it checked it. They built a benchmark called M T Bench, eighty hard multi-turn questions, and collected votes from human experts, plus crowd votes from Chatbot Arena. And GPT four's verdicts agreed with the experts more than eighty percent of the time, once you left out ties. Which is about as often as two humans agreed with each other.

B: [surprised] Huh. So it's as good as a second person.

A: On that data, yeah, roughly. But the same paper also catalogued how it went wrong. It preferred whichever answer came first. It preferred longer answers, even when the extra length was just padding. It seemed to favour its own outputs. And it struggled to grade maths it couldn't solve itself. And every judge you build today inherits those exact failure modes. The fixes they proposed, swap the order, give it a reference answer, make it reason before it decides, those are still where you start.

<!-- section: The Idea: Why a model -->

A: So, step back for a second. You've basically got three ways to grade an output. One, a program. Like, the agent extracted a price, and you check it equals nineteen ninety-nine. Exact, free, instant. But it only works when "correct" can be written down as code. Two, a person. A person can handle anything. But they cost minutes and dollars per item, they get tired, they disagree with other people, and they're not grading ten thousand items for you every night. And three, a model. It handles most of the open-ended stuff a person can, for a few tenths of a cent an item, in seconds, at whatever volume you want. But it's a model. So it has blind spots and biases, and you don't know what they are until you measure.

B: So the judge lives in between the first two.

A: Right in the gap. Stuff that's too open-ended for code, like "is this summary faithful", or "is this result relevant to the query", or "did the agent's final answer actually address what the user asked". And too much of it for people. And its job is to stand in for a person. So there's really only one question that matters about any judge. How often does it say what a careful person would have said? Everything else we talk about is either a way of answering that, or a way of making the answer better.

<!-- section: The Idea: Three ways to ask -->

A: Now, there are three ways to ask it. The first is pointwise. You show it one answer and get a score on a fixed scale. Relevance zero to three, helpfulness one to five, something like that. It's the natural choice when you want an absolute number you can track over time, or when you only have one system's outputs.

B: What's wrong with that? That's just... a score.

A: The scale is fuzzy. What's the difference between a three and a four? Two runs of the same judge can drift. Or you tweak the prompt over a few days and the whole scale slides. And models tend to bunch their scores. Lots of fours, hardly any ones. Which makes small differences basically invisible. The fix for that is a rubric, which is just the written grading instructions, what to look for and what each score means, where every level is pinned to something concrete. That concrete thing is called an anchor. Like, "a two means the result is about the right topic, but doesn't answer the question." Anchors are what stop the scale from drifting.

A: The second way is pairwise. Two answers, which is better. And this is easier, for models and for people, for the same reason it's easier to say which of two coffees is stronger than to rate one coffee's strength out of ten. Relative judgements are just more stable than absolute ones. It's what Chatbot Arena uses. And it fits your actual question really well, "is the new ranker better than the old one". The weakness is the one from the opening. The two answers have to be shown in some order. And the order leaks into the verdict. It also scales badly if you want to rank a lot of systems, because every pair is its own comparison. And a pairwise win tells you "better". It doesn't tell you "good enough".

A: And the third way is reference-guided. You give the judge a known-correct answer, and you ask whether the candidate matches it in substance. And that's a really nice trick, because it turns "is this right?", which is hard, the judge has to actually know the answer, into "does this say the same thing as that?", which is way easier. In the Zheng paper it mattered most for maths and reasoning, where the judge would otherwise get fooled by a confident wrong solution it couldn't check. The catch is you need a gold answer for every item. Which you often have for extraction and question-answering tasks, and rarely have for open-ended ones.

A: So picture the three side by side. Each one is a box going into "judge plus rubric", and something coming out the bottom. Pointwise, one answer in, a score from one to five out. Absolute, but the scale drifts. Pairwise, two answers in, A or B or tie out. Relative, but order matters. Reference-guided, an answer plus a gold answer in, yes or no, does it match, out. The easiest to get right, but you need the gold answer. And you can mix them. A common setup for agents is reference-guided wherever the task has a known answer, and pointwise with a strict rubric where it doesn't.

<!-- section: The Idea: The biases -->

A: Okay. The biases. And the way to think about all of them is this. A judge is a language model reading a prompt. So anything that nudges a language model's next token nudges the verdict. Including stuff that has nothing to do with quality. I'll go roughly in order of how much they'll hurt you.

A: Position bias first. The judge prefers one slot, usually the first one, regardless of what's in it. Zheng and colleagues measured it by asking each question twice with the order swapped and counting how often the verdict stayed the same. GPT four was consistent about sixty-five percent of the time.

B: [surprised] Sixty-five? That's the good judge?

A: That's the good one. Weaker judges were way worse. One of them was consistent less than a quarter of the time, and almost always just picked the first answer. And a separate paper that same year, Wang and colleagues, it's literally called "Large Language Models are not Fair Evaluators", showed that just swapping the order could flip which of two models "won" a benchmark.

B: But why would it even care about order? It's reading both.

A: Partly training data. In text, the first option in a list is often the favoured one. And partly attention. The first answer gets read with nothing to compare it against. The second gets read in light of the first. So they're not really read the same way.

A: Second, length bias. Also called verbosity bias. Longer answers win more often, even when the extra length adds nothing. Zheng tested this with what they called a repetitive list attack. They took answers that had lists in them and padded them, by rephrasing items that were already there. No new information at all. Weaker judges preferred the padded version more than ninety percent of the time. GPT four got fooled a lot less often. But not never.

B: [skeptical] I mean, to be fair, longer usually is better, right? A longer answer usually covers more.

A: Yeah, and that's exactly why it's sneaky. Length sometimes is a real signal. A longer answer often is more complete. So the judge learned a correlation that's true on average... and wrong exactly when somebody's padding. And this matters enormously when the thing you're judging is being trained against the judge. A model that's optimised to win judge comparisons learns to be long. Alpaca Eval, a popular leaderboard that's graded by a judge model, ended up publishing a length-controlled version in twenty twenty-four for exactly that reason.

A: Third, self-preference. A judge tends to rate outputs from its own model family higher. Zheng saw signs of it. Then Panickssery and colleagues, in twenty twenty-four, showed that models can recognise their own outputs better than chance, and that recognising them goes along with favouring them. And the plain explanation is kind of neat. A model's own outputs are, almost by definition, the text it finds most likely. So "this reads naturally to me" leaks into "this is good". So if you judge your fine-tuned Llama against GPT outputs, using a GPT judge... the judge has a horse in the race.

A: Fourth, confident tone. Answers that sound sure of themselves get rated higher than hedged answers with the same content. Fluent wrong answers can beat halting right ones. And Hosking and colleagues found in twenty twenty-three that assertiveness skews human ratings of factuality too. So it's not only a model problem. But a person can sometimes check a fact. A judge has no way to check a fact it doesn't know. This is a cousin of sycophancy, which is a model's habit of telling people what they seem to want to hear, or agreeing with whoever sounds most certain, instead of what's true. The judge just defers to whichever answer sounds most like an authority.

A: And fifth, format bias. Markdown headers, bullet points, bold text, little brackets that look like citations. All of it looks like effort, and judges reward it. For search snippets this shows up as preferring results with structured, list-y text over plain prose that actually answers the query better.

B: [working it out] Okay, so they're all kind of the same thing. It's grading on stuff that usually comes along with quality, instead of the quality.

A: That's the pattern. Every bias is the judge using a feature that correlates with quality. Position in a list, length, fluency, familiar style, formatting. Instead of quality itself. And honestly you'd do the same if you had to grade ten thousand essays in an afternoon. So the fix, every time, is to break the correlation. Either take the feature away from what the judge sees, or measure how the judge reacts to it and cancel that out.

<!-- section: The Idea: Predict, what does swapping fix -->

A: So try this. You've got a judge with strong position bias. It picks the first answer eighty percent of the time. And you ask every pair twice, once in each order. Which bias does that cancel? Position, length, both, or neither? And say the judge also likes longer answers. Does swapping help with that?

B: Both, I'd say. You're showing it everything both ways, so whatever it's leaning on gets evened out.

A: [gently] It's position only. Length, it does nothing for. And the reason is kind of the key idea here. Position bias is a push toward a slot. When you swap the order, the push lands on the other answer. So you ask both ways, the two pushes point in opposite directions, and when you average, they cancel. Length bias is a push toward a property of the answer. The longer answer is longer in both orders. So the push points at the same answer both times. And if you average two verdicts that are both tilted the same way... you get a verdict that's still tilted.

B: Oh. Because the length came along with it when it moved.

A: Yeah, the length travels with the answer. The slot doesn't. So for length you need something else. Trim the answers to the same length, or measure the length effect and subtract it.

<!-- section: The Idea: The swap test -->

A: So that's the single most useful check you can run on a pairwise judge, and it costs one extra call per item. Ask twice, once in each order. Order one, A then B. Order two, B then A. And there are four ways it can come out. Picture a little two-by-two. If it picks A both times, A wins. If it picks B both times, B wins.

B: [working it out] And if it picks A the first time and B the second time... that's, wait. A was on top the first time and B was on top the second time. So it just picked whatever was on top.

A: Right, the first slot won both times. It was following the position, not the content. And the reverse, B then A, is the second slot winning both times. In both those cases the honest verdict is a tie. And two numbers fall out of this basically for free, and you should report both for any pairwise judge. The consistency rate, which is the fraction of pairs where the same answer wins in both orders. A perfect, unbiased judge on clear-cut pairs would be near a hundred percent. On genuinely close pairs it'll be lower even without any bias, because the judge is a bit noisy. And the first-slot win rate. Across all the calls, so twice the number of pairs, how often did the first-shown answer win? If answers landed in slots at random, that should be about fifty percent. Sixty means a real tilt. Eighty means the judge is mostly reading the position.

A: Then you have to combine the two verdicts. The hard way is what we just did. If they agree, that's the answer. If they disagree, call it a tie. The soft way is, you get the judge's probability that the first answer wins, convert both to "probability A wins", and average. And you can get that probability two ways. If your API returns log-probs, that's short for log-probabilities, it can tell you how likely the model thought each possible next token was. So the probability it gave to the token "A" versus the token "B" is a free confidence score. Or, if it doesn't, you sample it several times and count.

B: And that's better than just calling it a tie?

A: [leaning in] It's better than it sounds, actually. Think of the judge as having an internal score for "the first one wins". And that score is made of three things added up. The real quality gap between the two. Plus a position push toward whatever's first. Plus some noise. Now look at it from A's point of view. In order one, A is first, so the score is the gap plus the push. In order two, A is second, so flipped back to A's side, it's the gap minus the push. Average the two probabilities, and you land above fifty percent exactly when those two scores add up to something positive. And when you add them, the push shows up once with a plus and once with a minus. It's just gone. So say A is a little better, a gap of one, and the judge has a big push toward the first slot, say three. Order one gives A four. Order two gives A minus two, so B looks way better there. Add them, you get two. Positive. A wins. The push of three canceled exactly.

B: [surprised] Exactly. Not approximately.

A: Exactly, for a constant push, if you're averaging probabilities. The hard version can't do that. It throws away the "how sure", and all it can do is shrug and say tie.

<!-- section: The Idea: A biased judge, the simulator -->

A: And you can watch this happen. Picture a little simulator. Sixty pairs where we know the right answer, a fake judge using exactly that model, gap plus push plus noise, and the noise is fixed, so moving a slider changes only the bias. There's a position bias slider, a length bias slider, and a toggle called "pad the losers". Underneath there are three bars. One order only, swap with ties when they disagree, and swap with the probabilities averaged. Plus two readouts, how consistent it is across the swap and how often the first slot wins. And a grid of sixty little squares, one per pair, marked right, wrong, or tie.

A: Start with both sliders at zero. One order gets about eighty-seven percent right. The hard swap, about the same. And the averaged swap gets about ninety-five.

B: Wait, why's it better when there's no bias at all?

A: Because averaging two independent looks at the same pair also averages away some of the noise. That's a bonus on top of removing bias. Now push position bias up to one. One-order accuracy drops to about seventy-two percent. The first slot wins seventy-eight percent of calls. Consistency drops to forty-three percent. And the averaged verdict? Still ninety-five.

B: And the hard one?

A: It stays down with the one-order number. Because every inconsistent pair turns into a tie, and a tie's only worth half a point. Now crank position bias to two or more. The judge always picks the first slot. One order is a coin flip, consistency is near zero... and the averaged verdict is still ninety-five. That's the cancellation, working even when the bias is overwhelming.

B: [skeptical] That feels too clean. A real judge that always picks first isn't really reading anything.

A: Yeah, and that's fair. In real life a judge that biased has probably stopped reading carefully at all, so the "fixed noise" assumption breaks. That end of the slider is a thought experiment. Okay, now the other one. Position back to zero. Length bias up to one. And turn on "pad the losers", which makes the worse answer always the longer one in every pair. All three bars drop to around sixty-five percent. And the swap gives you no help at all. Push length bias to two, and all three fall below chance. The judge is now reliably picking the padded loser.

B: [quietly] Huh. Worse than guessing.

A: Worse than guessing. And that "pad the losers" toggle is basically what a model learns to do if it's trained against a length-biased judge. So if you want it in one line: swapping fixes biases tied to the slot. It can't fix biases tied to the answer.

<!-- section: The Idea: Mitigations -->

A: So what does fix each one? Quick run through. Swap the order and average, that's position. Length control, that's for length. You either trim or cap the answers before judging, or you do what the length-controlled Alpaca Eval does. You fit a simple regression of the verdicts against the length difference, and you report the win rate with the length effect taken out. A rubric with concrete anchors, including saying out loud "longer is not better" and "formatting does not count". That helps with length, format, and the drifting scale. A reference answer, that's for confident-but-wrong, and maths. A judge from a different model family, that's for self-preference. Several judges, like a majority vote across three different judge models, or three samples of one, that's for noise and one model's particular quirks. And hide the source. Never tell the judge which system wrote which answer. That's for brand or name bias.

B: The reasoning one. I'd just ask it to explain its answer. That's what I'd naturally do.

A: [serious] That's the one people get backwards, so it's worth slowing down on. If the prompt asks for the verdict first and the explanation after, the model commits to a letter in its very first output token. And then it writes a justification for whatever it already said. That's called post-hoc rationalisation. Explaining a decision after it's made. The explanation sounds like reasoning, but it had zero influence on the decision. So as a check, it's worthless. What you want is the analysis first, then the verdict on its own final line. Now the verdict token gets generated after the reasoning, and it's conditioned on it. It's the same chain-of-thought effect you know from reasoning tasks.

B: So "explain your answer" after the answer is basically decoration.

A: Basically, yeah. And it's not free, because reasoning is output tokens, and output tokens are the expensive ones. We'll get to cost. If your judge model already thinks internally before answering, some of this happens on its own, but you still pay for those thinking tokens as output.

A: And the other one worth slowing down on is the different model family. Remember the idea behind keeping your eval separate. The thing doing the grading can't share the blind spots of the thing being graded, otherwise it waves the same mistakes through. Same here. A judge that shares training data, tokenizer, and style with one of the contestants shares its blind spots. Now, if you're comparing two of your own fine-tunes of the same base model, this matters less. Neither one is "the judge's own". But if you're comparing your model against a vendor's model, use a judge from a third family. Or use two judges from different families and only trust the verdicts they agree on.

<!-- section: The Idea: The judge is a classifier -->

A: Okay. Here's the reframe that makes everything else fall into place. A pairwise judge takes an input, a query plus A plus B, and outputs a label. A, B, or tie. What's that?

B: [a bit unsure] I mean, it's GPT. It's a smart model reading two results. I kind of just think of it as the answer.

A: [firmly] It's a classifier. A three-class classifier. And your hand labels are the ground truth. And you already know exactly how to evaluate a classifier. You build a confusion matrix and you compute agreement. People skip that for judges because the judge feels like an oracle. It isn't. It's a classifier with unknown accuracy, and it's about to grade the model you're going to ship.

A: So picture the grid. Three by three. Rows are what you said, columns are what the judge said, A, B, tie. And the diagonal, top left to bottom right, is where you agree. Say you've labelled a hundred pairs. You said A forty-five times, B forty times, tie fifteen times. The judge said A forty-nine times, B forty-one, tie only ten. On the diagonal, thirty-eight times you both said A, thirty-two times you both said B, and only four times you both said tie. So thirty-eight plus thirty-two plus four, seventy-four out of a hundred.

B: Seventy-four percent. That sounds... fine? Decent?

A: [cautious] It might be. But raw agreement, accuracy, is really easy to fool. Suppose ninety percent of your pairs are ones where the new ranker is clearly better. A judge that always answers "A", no matter what, scores ninety percent. And it learned nothing.

B: Oh. Yeah.

A: So the fix is something called Cohen's kappa. It asks how much better than luck the judge does. You need two numbers. Observed agreement, which is just accuracy. Here, seventy-four percent. And chance agreement. That's how often you'd match if the judge kept its overall mix of labels, so forty-nine percent A, forty-one B, ten tie, but handed them out at random. And you get that from the totals. You said A forty-five percent of the time, the judge said A forty-nine percent, so by luck you'd both land on A about twenty-two percent of the time. Do the same for B, forty percent times forty-one percent, about sixteen. And for tie, fifteen percent times ten percent, about one and a half. Add those up, and luck alone gets you about forty percent agreement.

B: So forty of the seventy-four was free.

A: Kind of, yeah. And kappa is, of the room above luck, how much did the judge fill? There's sixty points of room between luck at forty and perfect at a hundred. The judge got to seventy-four, so it filled thirty-four of those sixty points. Thirty-four over sixty is about point five seven. And the "always A" judge on that ninety-ten set? Its observed agreement is ninety percent, and chance agreement is also ninety percent, so it filled none of the room. Kappa of zero. I checked both of those with a few lines of Python.

A: So kappa is one for perfect agreement, zero for luck-level, and negative if you're worse than luck. There's a common rough reading from Landis and Koch, back in nineteen seventy-seven, that calls point four one to point six oh "moderate" and point six one to point eight oh "substantial". Don't treat those as law. The useful comparison is with how well two humans agree on the same items. If you and a colleague only agree at a kappa of point six five, then a judge at point six is about as good as a second person. You can't expect point nine from it.

A: And then go back to the grid itself, off the diagonal. That's the part that tells you how it's wrong, which accuracy and kappa can't. Look at the bottom row. You called fifteen pairs a tie. The judge found four of them. It almost never says tie. And that's a specific, fixable rubric problem. You add a line like "say tie when neither result answers the query better, and don't break ties on length". You'd never see that in a single number.

A: If your judge gives scores instead, say relevance zero to three, you use rank correlation. Spearman correlation is the usual one. You replace each score with its rank and then correlate the ranks. One means the two orderings agree perfectly, zero means no relation. It only cares about order, not exact numbers, so a judge that's consistently one point harsh still scores well. And usually order's what you need for comparing systems. But if you report the absolute number, like "average relevance two point three", then you also need to check exact agreement and a weighted version of kappa.

A: Then calibration. If your judge gives a probability or a confidence, check whether it means anything. Bucket its verdicts by stated confidence. Fifty to sixty percent, sixty to seventy, all the way up to ninety to a hundred. And check accuracy in each bucket against your labels. A judge is calibrated if, among all the times it says "eighty percent sure", it's right about eighty percent of the time. And this matters because calibration is what lets you act on confidence. Say you set up a rule. Auto-accept any verdict above ninety percent, send the rest to a human. If the ninety percent bucket is actually only right seventy percent of the time, that routing rule is silently wrong.

B: [working it out] Okay. So say I iterate on the rubric and version two gets eighty-two percent and version one got seventy-eight. That's... version two's better.

A: [jumping in] That's the other trap. A hundred labels isn't a lot. A judge at eighty percent agreement on a hundred items has a ninety-five percent confidence interval of roughly plus or minus eight points. So the real number could be anywhere from about seventy-two to eighty-eight. Eighty-two versus seventy-eight is well inside that wobble. On its own, it's not evidence. The way to answer it properly is the stuff from checking whether an improvement is real. You can bootstrap, which means resampling your hundred pairs with replacement thousands of times and seeing how much the number jumps around. And you want the paired version. Both rubrics graded the same hundred pairs, so you compare them pair by pair, which throws away a lot of the noise that comes from which pairs happened to be easy.

<!-- section: The Idea: What do you check first -->

B: Okay, let me try one on you. My manager sees the judge got eighty-eight percent against my labels, and says great, ship the eval. What should I actually be checking?

A: [relaxed, thinking out loud] So first, the label balance and kappa. If most pairs have the same right answer, eighty-eight might be close to luck. Then the confusion matrix. What kind of mistake makes up the other twelve? A judge that never says tie, or that always misses in one direction, is biased in a way that actually shifts system comparisons. Then the interval. Eighty-eight on a hundred items is roughly plus or minus six points. Then, was the eighty-eight measured on the same items I tuned the rubric on, or on a held-out set? Then, does the judge come from the same family as one of the systems being compared? And the swap test. Because one-order accuracy can hide strong position bias that just happens to line up with how the pairs were ordered.

B: Like if I built the pairs with the new result always on top.

A: Exactly that. Then position bias looks like the judge agreeing with you.

<!-- section: The Idea: Writing rubrics that hold -->

A: So, rubrics. A rubric is a specification. And the judge is a very literal, very fast, slightly lazy reader. The same rules that make a spec good for a contractor make it good for a judge. Say what you mean, define the edge cases, give examples. For search relevance, which is your world, the standard way information retrieval people have done this for a long time is a graded scale with written definitions. Bing did something like it at large scale with an L L M, that's Thomas and colleagues, twenty twenty-three. It goes something like this. You open by saying, judge only relevance to what the searcher wanted, ignore length, writing quality, and formatting. Then a three means it answers it. A searcher would stop here. Like, the query's "python sort dict by value", and the result shows the actual sorted call, with a key that pulls out the value. A two means useful. Right topic, has part of the answer, or gets you there in one click. Same query, but the result explains sorting lists of tuples, and never mentions dicts. A one is related. Same general area, but the searcher wouldn't find the answer there. Like a result about dict comprehension syntax. And zero is not relevant, spam, or a broken page. And then for a pair, pick the result with the higher grade. If they're the same grade, say tie. Don't break ties on length or detail.

B: What makes that one work, versus "rate the relevance"?

A: A few things. Each level is a behaviour of the searcher, "would stop here", not an adjective like "highly relevant". Each level has an example from the actual domain. The features that shouldn't count are named and excluded. And the tie rule is explicit. That last line goes straight at the tie-blindness from the grid.

A: Now agents, which is basically TinyFish's whole world. "Did it work?" is usually a mix of things a program can check and things it can't. So you split it. You give the judge the task, the agent's final answer, the URL it ended on, and a summary of its steps. And then four yes-or-no questions, each with one sentence of evidence quoted from the inputs. One, did the agent reach a page where the requested information is visible? Two, does the final answer contain the specific information requested, not a description of where to find it? Three, is every value in the final answer supported by text on that last page? Quote it. And four, did the agent do anything the task didn't ask for that changes state? Submitting forms, buying something, logging in. It's a success only if one, two and three are yes and four is no.

B: That's a lot more structure than "did it succeed, one to ten".

A: That's the point. Two ideas in there. Decompose. Four narrow yes-or-no questions are each way easier to judge reliably than one fuzzy score. And when it fails, you know which part failed. And demand evidence. "Quote the text" forces the judge to ground its answer in what's actually there, instead of in how confident the agent sounded. That's your defence against the confident-tone bias.

A: And then a few general rules for any rubric. Binary or three-way questions beat one-to-ten scales. If you can't say what a six means versus a seven, neither can the judge. Name the features to ignore. Length, formatting, tone, which answer came first. Put the verdict on the last line in a fixed format, like the word VERDICT, a colon, then the letter. And parse it strictly. If it doesn't parse, that's a failure you count, not something you silently default. And iterate on the rubric using one part of your labels, a dev split, and report the final number on a part you held out.

B: Because otherwise you're tuning the rubric to your hundred examples.

A: Which is overfitting by a different name. Yeah.

<!-- section: The Idea: What it costs -->

A: [relaxed] Okay, money. Judging is cheap, but cheap times a lot is how you get surprise bills. So you do the arithmetic before every run. The cost is the number of items, times calls per item, times what one call costs. And one call is its input tokens times the input price, plus its output tokens times the output price.

A: And a judge prompt has two parts. The rubric, so the system prompt, the scale definitions, maybe a few worked examples. That's identical for every single item, and it can easily be one to two thousand tokens. Then the item, the query plus two results. That changes every call, maybe three to five hundred tokens. Then the judge writes its reasoning and verdict, maybe a hundred to two hundred tokens out. And that shared rubric is exactly what prompt caching is for. It's a provider feature that stores the processed form of the start of your prompt. Later requests that start with the exact same text reuse it, and pay a fraction of the normal input price for that part. Change one character in that prefix and you miss.

B: So rubric first, item after.

A: Rubric first, byte-for-byte identical every call, item after. So let's put numbers on one call. Fifteen hundred tokens of rubric, four hundred of pair, a hundred and fifty out. And some example prices. Three dollars per million input tokens, fifteen dollars per million output. And cache reads at a tenth of the input price. Those are just example prices. Check your provider's current ones.

A: No cache: nineteen hundred input tokens at three dollars a million, that's about half a cent. Point five seven of a cent. Plus a hundred and fifty output tokens at fifteen dollars a million, that's about a fifth of a cent. So about eight tenths of a cent per call. Seven dollars ninety-five per thousand judgements.

B: [working it out] And with the cache, only the four hundred pair tokens pay full price, and the fifteen hundred rubric tokens pay a tenth.

A: Right. Four hundred at full price is about a tenth of a cent. Fifteen hundred at thirty cents a million is tiny, about a twentieth of a cent. The output's the same as before. So three dollars ninety per thousand. The bill roughly halves. Writing the cache the very first time costs a bit more than a normal read, about one and a quarter times, on Anthropic's API, but over a thousand calls that's noise. And the swap test judges every pair twice, so double all of it.

B: So now most of what's left is the output.

A: Yeah. Two dollars twenty-five of that three ninety is output, either way. So output's more than half the bill once you cache. "Reason before verdict" is worth paying for, but ask for three sentences of reasoning, not three paragraphs. And three practical things about caching. It's a prefix match. So anything that varies, the item, a timestamp, a request ID, has to come after the cached part. Most providers have a minimum length below which nothing gets cached at all. It varies by model, from a few hundred to a few thousand tokens. So a tiny rubric won't benefit. And the cache expires after a few minutes of sitting idle by default, so run judgements in a steady stream, not one every ten minutes. And a lot of providers also have a batch API at around half price, if you can wait hours for results. For a nightly eval, you can.

B: Okay, so what happens when this has to scale? Like a hundred thousand items a night.

A: [working it out] Then it's worth optimising. Say you're at about four dollars per thousand swapped judgements. A hundred thousand a night is four hundred dollars a night. That's about twelve thousand a month. So, roughly in order. Cache the rubric, so it costs about a tenth. Use a batch API if results can wait, that's about half. Shorten the reasoning you ask for, since output tokens cost the most. Use the cheapest model whose kappa against your labels still holds up. Replace any part of the check that a program can do. And judge a random sample instead of everything. A few thousand items gives you a tight enough interval on a win rate. And that last one's usually the biggest win. You rarely need every single item judged just to compare two systems.

<!-- section: The Idea: When not to use a judge -->

A: Which gets to the most important rubric rule, and it's the one you apply before you even write a rubric. If a program can check it, use the program. Did the agent extract the right price? Compare it to the value on that page. Exact. Is the output valid JSON that matches the schema? Parse it. Did the code pass the tests? Run them. Is the answer to the arithmetic problem forty-two? Just check if it equals forty-two. Does the retrieved document contain the answer span from your labelled set? String match, or the usual ranking metrics.

B: [amused] So, don't ask GPT whether two numbers are equal.

A: [laughs] Please don't. A program has a kappa of one with itself, it costs nothing, and it can't be talked into anything by a confident tone. A judge in those places adds cost, noise and bias, and takes nothing away. Use the judge for what's left. Relevance, faithfulness, helpfulness, "did this answer the actual question". And even there, if you can write down a gold answer, go reference-guided over open-ended.

A: I'd also refuse one when there's no way to get any human labels to check it against. Not even a hundred of your own. Because then you just can't know what it's measuring. And there's one more case. Don't use a judge as a training reward without measuring it first. If you optimise a model against a judge, whether that's reinforcement learning from AI feedback, or picking your D P O pairs by which answer the judge preferred, every bias in the judge becomes a direction the model learns to move in.

B: So it's reward hacking. The model finds whatever the judge is lazy about.

A: That's exactly it. A judge with length bias produces a model that pads. It's the "pad the losers" toggle from the simulator, except now the model learns to do it on purpose.

<!-- section: Build It: Setup -->

A: So, let's build one. A pairwise relevance judge. You calibrate it against your own labels, catch it being biased, and improve it. Plan on an evening to label a hundred pairs and an evening to build and iterate. And the whole thing, API spend, should be a few dollars at most. Folder called judge in your workbench directory. Set a hard budget cap of a few dollars right in the code.

A: The setup's boring, an agent can write it. Pick any provider and a small, cheap model. Haiku-class, or whatever your provider's cheapest capable tier is. Keys go in environment variables. Never in code, never in a file you might commit. And you put a few more things in the environment too. Which model, the price per million input tokens, say a dollar, the price per million output tokens, say five, and a budget of three dollars. Then you write a tiny wrapper around the API call that does three things. It caches every response to disk, keyed by a hash of the exact request. So rerunning an analysis never pays twice. It adds up what you've spent from the usage numbers the API sends back, and refuses to make a call once you've hit the budget. And it marks the system prompt, your rubric, as cacheable. That's the shape of Anthropic's Python SDK. Other SDKs differ, so check their docs.

B: How do I know the caching's actually working?

A: The usage numbers tell you. The plain input token count only covers the uncached part of the prompt. Cached tokens show up in two separate fields, one for reading the cache and one for writing it. So if the cache-read number stays at zero across repeated calls, either your rubric's below the model's minimum cacheable length, or something in it is changing between calls. And one more thing you might notice. There's no temperature setting in there. Some current models don't accept one. And judges aren't fully deterministic anyway, which is one more reason the disk cache matters.

<!-- section: Build It: Label a hundred pairs -->

A: Then the most important task in the whole thing. And no agent can do it for you, because the whole point is that the labels are yours. You make a file of a hundred pairs. Each one's a query and two search results, so a title plus a snippet, or the first hundred and fifty words or so of the result. Good places to get them: your cross-encoder's eval data, a query plus candidates at different ranks. Or run thirty or forty of your own queries through any search API and take results from different ranks. And you want a mix. About forty easy pairs, where one result clearly answers the query and the other clearly doesn't. About forty-five hard pairs, both on topic, one better. And about fifteen genuine ties.

B: Do I care which one goes first in the file?

A: [emphatic] You do. Randomise which result goes in A and which in B when you build the file. Otherwise "the better one's usually A" leaks in from how you collected them, and you'd mistake position bias for agreement. Then you label them blind, before the judge has seen anything. The labelling tool is boilerplate, an agent can write it. It shows the query and both results, you hit A, B, or T for tie, and it appends your label to a file. For the hard ones, write down a one-line reason. You'll want those when you write the rubric.

A: And two things while you're labelling. First, write your own rubric as you go. Every time you hesitate, ask yourself what rule you just applied. Those rules are version one of your rubric. Second, a day later, re-label twenty random pairs without looking at your first answers.

B: [amused] To see if I agree with myself.

A: [amused] To see if you agree with yourself. And it's not a joke number, it's the ceiling. Your agreement with yourself is the best any judge can do against you. If you only agree with yourself eighty-five percent of the time, a judge at eighty-five is as good as you. Then you split. Sixty pairs are dev, you'll look at those while improving the rubric. Forty are test, and you don't look at those until the very end.

<!-- section: Build It: The judge -->

A: Then the judge itself. Three small functions. One builds the per-item part of the prompt, the query and the two results labelled A and B. Everything that's the same for every item goes in the system prompt, not there, so it caches. One parses the verdict. It looks only at the last line for "VERDICT colon" and a letter, and if that line doesn't match, it returns nothing and you count it as a parse failure. And the main one judges a pair, with a flag for swapping. If swap is on, it shows B first. But, and this is the important bit, it always reports the verdict in terms of the original A and B. So "A" always means the original A won, whichever slot it was sitting in.

B: Why start with a bad rubric on purpose, though? Why not just write a good one?

A: Because you want something to improve on, and you want to see what each change buys you. So version zero is one deliberately vague line. Which search result is more relevant to the query, answer A, B, or tie. From version one on, you ask for two or three sentences of reasoning first and the verdict on the very last line. And the swap bookkeeping is where the bugs live. Before you run a hundred of these, take one pair where A is obviously right and run it in both orders. If you get A both times, your flipping's correct. And if your API returns log-probs, grab the probability on the verdict token, so you can do the soft averaging. If it doesn't, skip it. The hard version's fine.

<!-- section: Build It: Measure agreement -->

A: Then you measure it like a classifier. A function that builds the three-by-three confusion matrix, rows are your labels, columns are the judge's. A function for kappa: observed agreement is the diagonal over the total, chance agreement is, for each label, your share times the judge's share, added up, and kappa's the room above luck it filled. And a bootstrap interval for accuracy. Resample your pairs with replacement, two thousand times, recompute accuracy each time, and take the values two and a half percent and ninety-seven and a half percent of the way up the sorted list. That's your ninety-five percent interval.

A: Check your kappa function on the hundred-pair grid from before. It should print about point five six seven. And on the always-A judge with ninety and ten, it should be exactly zero. Then run version zero on the dev split in one order, and print the confusion matrix, accuracy with its interval, kappa, and how many parse failures you got.

<!-- section: Build It: Catch the position bias -->

A: Next, catch the position bias. Run every dev pair a second time with swap on. And report the consistency rate, the first-slot win rate over all the calls, and then accuracy and kappa three ways. Order one alone, order two alone, and the hard combined verdict where disagreement becomes a tie. Plus the soft version if you have log-probs. And before you run it, write down what first-slot win rate you expect from a modern cheap model. Then look at the inconsistent pairs specifically. Are they mostly the ones you found hard, or ones you labelled as ties? Or are they ones you found easy?

B: Why does that matter? Inconsistent is inconsistent.

A: [patient] Because it tells you whether it's bias or honest uncertainty. If it flips on a pair you yourself went back and forth on, that's partly just a genuinely close call. If it flips on a pair you thought was obvious, that's bias. And those are worth reading one by one.

<!-- section: Build It: Catch the length bias -->

A: Then length bias, with fluff. You write a little pad function that takes a result and tacks on filler sentences that say nothing about the query. Stuff like "This page provides a comprehensive overview of the topic." "Readers will find a range of helpful information here." "The content is regularly reviewed for accuracy." You draw from that pool until you've added however many words you asked for. Then take every dev pair where you labelled one result as better, and make two variants. Pad the loser with about sixty words. The right verdict hasn't changed at all. So every flip toward the padded loser is length bias. And pad the winner by the same amount. Count flips there too. You'd expect few. If there are a lot, the padding's confusing the judge some other way. And you judge all of these with the swap test, so position bias doesn't muddy the measurement.

A: And then try a second kind of padding. Instead of generic fluff, it echoes the query's keywords, without actually answering it.

B: [working it out] That one should be worse. It looks relevant on the surface.

A: That's the prediction, yeah. It tests a different bias, keyword matching, and you'd expect it to fool the judge more. And real S E O spam looks exactly like that.

<!-- section: Build It: Iterate the rubric -->

A: Then you iterate the rubric, keeping every version so you can rerun any of them. A reasonable sequence. Version one: reasoning first, verdict on the last line, explicit tie rule. Version two: the zero to three relevance scale with anchors, rewritten with examples from your own queries, and the rules you wrote down while labelling. Version three: add "ignore length, formatting and writing quality", and two worked examples from the dev set, one hard pair and one tie. For each version, run the swap test on dev and write down accuracy, kappa, consistency, first-slot win rate, and the pad-the-loser flip rate. And after each one, look at the disagreements, and change the rubric to address the kind of mistake. Not the individual pair.

A: When you're done, and only once, you run your best version and version zero on the test split. That's your headline number. And use a paired bootstrap on those test pairs to say whether best actually beats version zero by more than noise. And then get an agent to review the rubric, for ambiguities and for anything from the dev set that leaked into the prompt.

<!-- section: Build It: Cost -->

A: And the last task is the bill. From the cached responses on disk, work out for your best rubric the average uncached input tokens, cached input tokens, and output tokens per call. Then the cost per thousand judgements, with and without the swap test, at your model's prices. Then what it would've cost with no prompt caching at all, by pricing the cached tokens at the full input rate. Check how many calls actually hit the cache. And then the "how does this scale" number. What would it cost to judge your ranker every night on five thousand queries, with the swap test? Per night, and per month.

A: And you're done when you've got a hundred pairs labelled by you, split sixty and forty, plus that twenty-pair check against yourself. A judge that works in either order and reports in terms of the original A and B. A filled-in row for at least four rubric versions on dev, and best and version zero on test. Position bias and length bias both measured, and you can say which fix you applied to each. And your cost per thousand judgements, with and without caching and swapping.

<!-- section: Measure -->

A: So what should the numbers look like? And I haven't run your data, so these are expectations to check, not results to match. Each row is a rubric version on a split, and the columns are accuracy with its interval, kappa, consistency, first-slot wins, pad-the-loser flips, and dollars per thousand with swapping.

A: You versus you, probably eighty to ninety-five percent on twenty pairs. Lower if you put in a lot of near-ties. That's the ceiling, so write it next to every judge number. Version zero on dev, probably decent on the easy pairs and noticeably worse on the hard ones and the ties. And a confusion matrix where the tie column is nearly empty. A vague prompt gives the model no permission to say tie, so it almost never does. And kappa well below accuracy, because all those easy pairs push luck-level agreement up.

B: And the position bias? After hearing sixty-five percent for GPT four, I'm expecting it to be awful.

A: [reassuring] Probably not, actually. Current models are a lot better than the twenty twenty-three ones. The first-slot win rate might be only a few points above fifty. Even so, expect a meaningful number of inconsistent pairs, piled up on the hard pairs and the ties. Inconsistency on the pairs you found hard is partly honest uncertainty. Inconsistency on pairs you found easy is bias, and those are worth reading one by one.

A: Length bias. With generic fluff, a cheap model will probably flip on some fraction of the pad-the-loser cases. With keyword-echo fluff, more. The version three instruction to ignore length should cut that down, but rarely to zero. And if the flip rate doesn't move between version two and version three, the instruction just isn't working. Then you need actual length control. Trim both results to the same length before judging.

A: Rubric iterations. Expect the biggest jump from version zero to version one or two, mostly from ties getting handled. Smaller gains after that. And each dev gain of a few points is inside the plus or minus eight to ten point interval you get with sixty items. So trust the direction across several versions more than any single step. And if test accuracy comes out well below your best dev accuracy, you've overfit the rubric to dev. Which is exactly why you held test out.

A: And cost. With a cheap model, a fifteen-hundred-token rubric and a hundred and fifty tokens out, expect cents per hundred judgements, and roughly a dollar or two per thousand with swapping. It depends a lot on the model's price. Caching should cut out most of the rubric's share of the input cost. If your cache-hit count is zero, check the rubric's above the minimum cacheable length. And the nightly five-thousand-query number is the one to take to your team. It's probably a few dollars a night. Cheap next to a human labelling budget. And that's exactly why it's worth spending one evening making sure it's measuring the right thing.

<!-- section: Break It -->

A: [playful] Now break it. Four ways. First one. Let it judge itself.

B: [skeptical] Meaning what, it grades its own answers?

A: Kind of. Take thirty of your queries and generate answers with two models, something like "what's the best result for this query and why". One is the judge's own model, the other's from a different family. You label which is better, yourself. Then you compare how often the judge picks its own family against how often you did. Any gap is self-preference. Then swap in a judge from the other family and see whether the gap flips. And that's the reason a judge should never come from the same family as one of the contestants.

A: Second. Verdict first. Take version two and move the verdict to the first line, reasoning after. Rerun. Accuracy usually drops. And when you read the reasoning on the ones it got wrong, you'll see it confidently justifying whatever letter came first.

B: [amused] So that's my "just explain your answer" idea, failing live.

A: [laughs] That's it failing live. That's what post-hoc rationalisation looks like in practice. And it's why "explain your answer", placed after the answer, isn't a check.

A: Third. Tune on the test set. Take your best rubric, look at where it disagrees with you on test, and fix the rubric for those. Test accuracy goes up. Now label thirty fresh pairs and measure again. It drops back. Probably below your original test number.

B: Because I just fit it to those forty.

A: [dry] Right. You learned nothing about the judge and you spent your only clean measurement. It's the same overfitting you'd catch instantly in a model. It's just harder to see when the parameters are English sentences.

A: Fourth. Confident and wrong. Take ten pairs where the better result is a plain, hedged answer. Rewrite the worse result so it sounds authoritative. "The definitive answer is", "experts agree", that kind of thing. Without adding any correct information. Count the flips. Then add a reference line to the rubric. You write a one-line correct answer for each of those ten queries and give it to the judge. And count again. Reference answers are the defence that doesn't depend on the judge already knowing the truth.

<!-- section: Go Deeper and Connections -->

A: If you read one thing after this, it's the original Zheng paper. The sections on position, verbosity and self-enhancement bias, and the agreement tables. And Hamel Husain's write-up on building a judge for a real business is the practitioner's version of all this. One domain expert, yes-or-no verdicts with short critiques, iterate until agreement's high. And for your ranker specifically, once your relevance judge's kappa against your labels is good enough, it becomes a cheap labeller. It can grade the top ten results for thousands of queries, and the ranking metrics on those labels, N D C G and friends, are how you decide whether the next cross-encoder ships.

<!-- section: Close -->

B: [working it out] Okay, let me try to say the whole thing. A model is a cheap way to grade stuff that's too open-ended for code and too much for people. But it's biased, toward the first slot, toward longer answers, toward its own family, toward confident stuff. So you swap the order, and that fixes the biases.

A: [gently] Most of that, yes. But swapping only fixes the one bias that's tied to the slot. Length, tone, formatting, its own family, those travel with the answer, so they survive the swap, and each one needs its own fix. And the bigger point is underneath all of it. The judge is a classifier standing in for you. So before you trust any number it gives you, you measure how often it says what you would have said, against your own hundred labels, above luck, with an interval. Compared to how often you agree with yourself. And if a program can check it... you don't need a judge at all.
