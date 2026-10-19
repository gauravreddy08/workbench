<!-- section: One ruler, three readings -->

A: [relaxed, thinking out loud] So you've retrained the cross-encoder, and you want to know if the new one's better. But you don't have relevance labels for this week's queries. So you do what everyone does. You take a few hundred queries, grab the top result from each ranker, and ask a strong model, "Here's a query and two search results. Which one's more relevant? A or B?"

B: And the new one wins.

A: The new one wins comfortably. Ship it, right? But then, just out of curiosity, you rerun the exact same comparisons with the two results swapped, so the old ranker's result is shown first. And now the old ranker wins.

B: [skeptical] Wait. Nothing changed except the order?

A: Nothing about the results changed. Only which one was on top. And then you notice the new ranker tends to pull up longer pages, with longer snippets. So you trim every snippet to the same length and run it again. And now it's basically a coin flip.

B: Huh. So what was it even measuring?

A: Some mix of relevance, which slot the answer was in, and how many words it had. And you can't tell how much of each, because you never checked the judge against anything. You used it as a ruler without asking whether the ruler was straight.

B: I mean, I'd have done exactly the same thing. If it's a strong model, it's probably better at judging relevance than I am. I kind of assumed it's an oracle.

A: That's the feeling everyone has, and it's the thing to drop. A judge is a measuring instrument. And instruments have to be checked against a known reference before you trust a reading. Here the reference is you, with about a hundred careful labels.

<!-- section: Judging the judge -->

A: The history here is pretty recent. By early twenty twenty-three, chat models had gotten good enough that the old automatic scores stopped meaning anything. There was this metric called BLEU, from machine translation, that just counts how many little runs of words in an answer also show up in a reference answer. And a great chat answer can share almost no words with the reference.

B: And people are slow and expensive.

A: Slow and expensive. Minutes and dollars per comparison. So people had started quietly using GPT four to grade other models. And then Lianmin Zheng and colleagues at LMSYS, the group behind Chatbot Arena, wrote a paper called "Judging LLM-as-a-Judge". They named the practice, and more importantly, they checked it. They collected votes from human experts, and GPT four agreed with the experts about as often as two experts agreed with each other.

B: Okay, so that's actually pretty good.

A: It's really good. But the same paper also catalogued how it went wrong. It preferred whichever answer came first. It preferred longer answers, even when the extra length was just padding. It seemed to favour its own writing. And it struggled to grade maths it couldn't solve itself. Every judge you build today inherits that list.

<!-- section: Why a model at all -->

B: So why use one at all, if it's that quirky?

A: Because of a gap. If something can be checked with code, like "did the agent pull out the right price", you just check it with code. Exact, free, instant. And people can grade anything, but they cost real time and money and they get tired, and they're not grading ten thousand things every night. The judge lives in the gap between those. Things too open-ended for code, like "is this result what the person actually wanted", and too many for people.

B: So it's standing in for a person.

A: That's its whole job. Which means the only question that matters about any judge is: how often does it say what a careful person would have said? And there are three ways to ask it. You can show it one answer and ask for a score. You can show it two and ask which is better. Or you can give it a known-correct answer and ask whether the candidate says the same thing. Comparing two is easier, for models and for people. It's easier to say which of two coffees is stronger than to rate one coffee out of ten. That's why it fits your question, "is the new ranker better than the old one?" But it has the weakness from the opening. The two answers have to go in some order.

B: And the known-answer one?

A: That one's sneaky good. It turns "is this right?", which means the judge has to know the answer, into "do these two say the same thing?", which is way easier. It mattered most for maths, where otherwise the judge gets fooled by a confident wrong solution it can't check.

<!-- section: Shortcuts that are right on average -->

B: Okay, so why does it have these biases at all? Why would a smart model care about which one's first?

A: A judge is just a language model reading a prompt. Anything that nudges its next word nudges the verdict, including things that have nothing to do with quality. And if you look at the list, there's a pattern. Every one of them is a shortcut that's usually right. Position, for one. In a lot of text, the first option listed is the favoured one. And the first answer gets read with nothing to compare it to, the second gets read in light of the first.

B: And length?

A: Length is the sneakiest, because longer answers often really are more complete. So the judge learned a correlation that's true on average, and wrong exactly when someone's padding. Then there's self-preference. A model's own writing is, by definition, the text it finds most natural, and "this reads naturally to me" leaks into "this is good". There's confident tone, where an answer that sounds sure of itself beats a hedged one with the same content. And formatting. Bullet points and headers look like effort.

B: [working it out] So it's grading the way I'd grade ten thousand essays in an afternoon. Skimming for things that usually mean good.

A: That's it. And the fix is always to break the shortcut. Either hide the feature from the judge, or measure how much the judge reacts to it and cancel that out. And length matters most when something's being trained against the judge. A model trained to win the judge's comparisons learns to be long. One popular leaderboard that used a judge ended up publishing a length-controlled version for exactly that reason.

<!-- section: Ask it both ways -->

A: So here's the single most useful check, and it costs one extra call per item. Ask every pair twice, once in each order.

B: And if the same answer wins both times, great.

A: If the same answer wins both times, the verdict's consistent. If the first slot wins both times, the judge was following the position, not the content, and the honest verdict is a tie. And you get two numbers out of it for free. How often it's consistent. And how often the first slot wins overall, which should be about half if nothing's going on.

B: Okay, but does swapping fix length too?

A: No, and this is the bit worth really getting. Position bias is a push toward a slot. Swap the order, and the push lands on the other answer. Ask both ways and the two pushes point in opposite directions, so they cancel. Length bias is a push toward something about the answer itself. The longer one is longer in both orders. So both verdicts lean the same way, and averaging them keeps the lean.

B: So swapping fixes biases tied to the slot, but not biases tied to the answer.

A: That's the one line. And I played with a simulated judge to watch it happen. Crank up the position bias until the judge is basically always picking whatever's first, and if you average its confidence across both orders, the answer barely moves. It just cancels out. But turn position back off, make the worse answer always the longer one, and nothing helps. Push the length bias far enough and the judge reliably picks the padded loser.

B: Which is what a model trained against that judge would learn to do.

A: On purpose. For length you need something else. Trim everything to the same length before judging, or measure the length effect and subtract it out.

<!-- section: The judge is a classifier -->

A: And now the reframe that makes everything else click. A judge that compares two results takes in a query and two answers, and outputs a label. A, B, or tie. That's a classifier. And you already know exactly how to check a classifier.

B: Compare it against ground truth.

A: And the ground truth is your own labels. So you label about a hundred pairs yourself, blind, before the judge sees anything. And honestly, that's the most important part, and nobody can do it for you, because the whole point is that the labels are yours.

B: And then just count how often it agrees with me?

A: Start there, but raw agreement is easy to fool. Say most of your pairs are ones where the new ranker is clearly better. A judge that always says "A" gets a great score and has learned nothing. So you use Cohen's kappa, which asks how much better than lucky guessing the judge does. And then you look at the full table of what it said against what you said, because that tells you how it's wrong. A really common one is a judge that almost never says tie. Which is a specific, fixable thing in the instructions.

B: What's a good kappa, though?

A: Compare it to people. Re-label some of your own pairs a day later, without looking at your first answers. Your agreement with yourself is the ceiling. If you only agree with yourself most of the time, a judge that matches you about that often is as good as a second you.

<!-- section: Instructions that hold -->

A: Then the instructions. The rubric. The judge is a very literal, very fast, slightly lazy reader. So you write it like a spec for a contractor. For search relevance, each grade describes what the searcher would do. "A searcher would stop here." Not "highly relevant", which is just an adjective. Every level gets an example from your own queries. You name the things to ignore, like length and formatting. And you spell out when to say tie.

B: And the reasoning-first thing?

A: Make it write its reasoning first and the verdict on the last line. If the verdict comes first, the model commits to a letter and then writes a justification for whatever it already said. That's rationalising, not checking. And for agents, which is TinyFish's world, don't ask "did it succeed, one to ten". Break it into narrow yes or no questions. Did it reach a page where the information is visible? Is every value in its answer actually on that page? And make it quote the text. Quoting is your defence against the agent just sounding confident.

<!-- section: When not to -->

B: Is there a case where you just shouldn't use one?

A: The rule before any rubric is: if a program can check it, use the program. Did it extract the right price? Compare it. Is it valid JSON? Parse it. Did the code pass? Run the tests. A program can't be talked into anything by a confident tone. A judge there only adds cost and noise.

B: And the other case?

A: Never use a judge as a training reward without measuring it first. Because whatever you train against it learns every bias it has. A judge that likes length produces a model that pads. That's the whole story from the simulated judge, except now the model's doing it on purpose.

<!-- section: Ending -->

B: Okay, let me try. A judge isn't an oracle, it's an instrument. It takes shortcuts that are usually right, like position and length. I ask both ways to cancel the position thing, but length needs its own fix. And before I trust it, I label a hundred pairs myself and check it like a classifier. And if it agrees with me often enough, I can trust it.

A: Mostly. The part I'd sharpen is "often enough". Agreement alone can be luck, so it's agreement above luck, compared to how often you agree with yourself, and on pairs you didn't use to tune the instructions. You trust the reading because you checked the ruler, not because the ruler is clever.
