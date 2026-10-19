<!-- section: The Problem -->

A: [relaxed, thinking out loud] Okay, so imagine you've got your tiny language model working. The training run you trust. And instead of the ready-made web dataset, you decide to train it on Wikipedia. You grab the raw dump, tokenize it, train overnight, and in the morning you sample from it. And it writes something like: "The city is in the north of the country." Fine so far. And then it writes a curly brace, another curly brace, "cite web", a pipe, a half-finished URL, "access date", and then a category tag.

B: [laughs] It learned the citation syntax.

A: It learned exactly what you showed it. And what you showed it wasn't Wikipedia. It was Wikipedia's source code. The markup language the articles are written in, with all its templates and citation boxes and tables. A good chunk of your token budget went into teaching a small model to close curly braces.

B: Okay, but that's just a stripping problem. Strip the markup and you've got, I mean, Wikipedia. It's about the cleanest text there is. Humans curate it.

A: That's what I'd have said too. So you strip the markup and train again. And it's better. But some samples are suspiciously fluent. Whole sentences, word for word, about French villages. "Such and such is a former commune, it's in this region, in this department, in the north of France." Over and over. And your validation loss looks great. Partly because some of your held-out articles share whole paragraphs with articles in the training set.

B: So the test is leaking.

A: The test is leaking, and the model is memorising a template. And none of this is a modelling problem. You could swap in a fancier architecture, and every one of these would still be there. Because a model doesn't learn "English", or "facts". It learns whatever distribution of text you hand it. Every quirk in that text becomes something it spends its limited brain on predicting.

<!-- section: The data became the model -->

A: [warm] And the field kind of learned this the hard way over a few years. GPT two was trained on pages that had been linked from Reddit posts with a few upvotes. Which is a crude quality filter, but a clever one. A human found it worth sharing.

B: Outsourcing the judgment to Reddit.

A: Pretty much. Then Google's T five paper did something unusual. It actually published its cleaning rules. Keep only lines that end in punctuation. Drop pages with too few sentences. Drop anything with "lorem ipsum" in it. And drop any page with a curly brace.

B: Any curly brace? That kills all the code.

A: It does. Which is exactly why that dataset has almost no code in it. Every rule throws out some good stuff with the bad. Then DeepMind's Gopher paper published a set of simple quality rules that people still copy. And then Hugging Face put out FineWeb, a huge cleaned web dataset, and they released the experiments behind every single decision. Including one where they had a big Llama model grade a few hundred thousand web pages on how educational they were, trained a small cheap model to imitate those grades, and ran that over everything. Keeping the high scorers made models noticeably better at knowledge and reasoning tests.

B: So a model judging the data for another model.

A: Right. And the arc of those years is that the model designs mostly converged. Everyone's using roughly the same transformer. And the data became the thing that separated good models from bad ones.

<!-- section: Most of it is markup -->

A: So let's go through it on the real thing. Simple English Wikipedia. Same format as the full one, but much smaller, so a full pass takes minutes on a laptop. The first step is just getting text out of the markup. Links keep their visible words. Templates, references, tables, file links, category tags, all removed. And they nest inside each other, a reference inside a template inside a table, which is why you use a real parser instead of regexes.

B: How much is left after that?

A: That's the first real surprise. I tokenized the raw source of every article, and then the extracted text. More than four out of five tokens were markup. Infoboxes, citation templates, tables, references. The actual prose is a small slice of the file.

B: Huh. So the raw model wasn't learning Wikipedia with some noise. It was mostly learning markup with a bit of Wikipedia.

A: Mostly markup. And here's the other thing I didn't expect. When I timed every stage of the pipeline, extraction was by far the slowest. Building a parse tree of every article in Python is a lot of work. The clever-sounding stuff, the hashing, was second. And tokenizing, the part everyone worries about, was basically a rounding error, because the tokenizer's core is written in Rust and runs on lots of threads at once.

B: [working it out] So the expensive part is understanding the format.

A: That's usually the shape of it. If you needed this much faster, you'd attack extraction first. Not the tokenizer.

<!-- section: What counts as good -->

A: Then the hard question. What's "good" text? Nobody has a definition, so you use proxies. Simple rules first. And my favourite is one that sounds silly. Count the stop words. The, of, and, to, that. Real sentences are full of them. Lists, tables, keyword spam aren't. So if a document barely has any, it's probably not prose.

B: That's kind of brilliant. Junk doesn't say "the".

A: Junk doesn't say "the". And then there's a language filter, a tiny fast model that guesses what language something's in. On a web crawl it throws out a huge amount. On Simple English Wikipedia, it threw out a small number of articles, and when I read them, most of them were English. One sentence about a little town in France, half of it French place names, and the model was sure it was French.

B: So it's unreliable on short text full of names.

A: Very. On the web, that error rate is fine. On a curated English corpus, you'd want to be careful. And then the modern step is the one FineWeb did, a small model as the judge. Which works really well, with two catches. You inherit the judge's taste. FineWeb's educational filter is great for school knowledge, and not obviously better for conversation, or code. And the judge can't be the same thing you evaluate with, or you're grading your own homework.

<!-- section: Almost the same -->

B: Okay, and the French villages. That's duplicates?

A: That's the interesting kind. First, exact duplicates. You hash each document, keep the first one per hash. On the web that catches a lot of mirrors and reposts. On Wikipedia, it caught almost nothing. A handful of pairs. Like three Japanese footballers whose one-line articles became identical once their info boxes were stripped out.

B: [skeptical] So Wikipedia doesn't really have a duplicate problem.

A: It doesn't have an exact duplicate problem. It's got thousands of articles generated from one template by bots. French communes, Italian towns, asteroids, US counties. Each one differs from the others by a name and a number. Hashing misses them completely. But to the model, it's the same lesson repeated thousands of times. And repetition is sneaky. A document that appears a thousand times gets a thousand times the gradient. It's like a hidden learning rate boost on exactly the text you care about least. The model memorises it instead of generalising.

B: So you need "similar", not "same". But comparing every article to every other article is... that's an enormous number of pairs.

A: Tens of billions, even for Simple English. And the trick for this is genuinely one of the most beautiful ideas I know. It's called MinHash. Cut each document into overlapping runs of a few words, call those shingles. Two documents are similar if they share most of their shingles. Now imagine taking every possible shingle in the world and shuffling them into one random order. For each document, write down which of its shingles comes first in that order.

B: Okay...

A: Now, what's the chance two documents write down the same one? Look at all the shingles they have between them. Whichever one comes first in the shuffle is equally likely to be any of them. If it's one they share, they both report it, and they match. If it's one only one of them has, they don't. So the chance they match is exactly the fraction of shingles they share.

B: [working it out] Oh. So one shuffle is a coin that comes up "match" with exactly the similarity as its probability.

A: That coin. Flip it with a bunch of different shuffles, which really means a bunch of different hash functions, and the fraction of matches estimates the similarity. Each document becomes a short fingerprint of numbers. And then the second trick, called LSH, locality-sensitive hashing, means you don't even compare most fingerprints. You chop each fingerprint into chunks, drop each chunk in a bucket, and only compare documents that land in the same bucket at least once. Similar documents almost always collide somewhere. Unrelated ones almost never do.

B: So it's linear. You never look at most pairs.

A: You never look at most pairs. And when I ran it on its own, it flagged a decent slice of Simple English Wikipedia as near-copies. And the biggest clusters were exactly what you'd guess. Hundreds of French communes from one department. Hundreds from another. Village after village in Hungary, word for word except the name and how many people live there.

B: So humans curate Wikipedia, but bots write a lot of it.

A: Bots write a lot of it. And then there's a twist I love. When I ran the length filter first, the one that drops really short articles, near-dedup found almost nothing extra. The stubs were short. The length filter had already eaten them. Filters overlap, and the order you run them in decides which one gets the credit.

B: So dedup's always good, just sometimes redundant.

A: Not even always good. FineWeb expected that deduplicating across all their web crawls at once would be best. It wasn't. Doing it within each crawl separately trained better models. The global version threw out a lot of good content that genuinely shows up in many crawls, because it's good. And what survived skewed toward junk. Dedup is a tool, not a virtue. You measure it.

<!-- section: Keeping the test out -->

A: Then the leak. You hold out some articles as your test set, and you check that no training document shares a long run of words with them. Thirteen words in a row is long enough that it's very unlikely to be a coincidence. And I thought, this is pointless. They're different articles.

B: But they leaked.

A: Thousands of training articles shared at least one of those runs with my held-out set. And when you look at which runs, it splits in two. Some of it is template sentences. "Scientists say this frog is not in danger of dying out." Written by a bot across hundreds of articles. That's not a leaked fact, but a model that's seen that sentence a couple of thousand times will predict it perfectly in the test set, so it still inflates the score.

B: And the rest?

A: Real copying. The article on rings in mathematics shared whole paragraphs of definitions with the article on fields, which was in my test set. People copy between articles. That's exactly the leak that made the validation loss look too good at the start.

B: [skeptical] And while you're scrubbing, you're also pulling out personal stuff? Emails, phone numbers?

A: Right, and that one taught me to always look before you trust a rule. I wrote two quick patterns, one for emails and one for phone numbers. And on a small sample of articles they fired tens of thousands of times. Almost none were phone numbers. Population figures, sports stats, date ranges, book numbers. A phone pattern loose enough to catch every phone format eats every long number in an encyclopedia.

<!-- section: Order and packing -->

A: The last part is getting it into a shape the trainer can eat. You tokenize everything, put an end-of-text marker after each document, and lay them all end to end in one long stream. Then you just cut that stream into rows of the length you train on. No padding, no wasted compute.

B: So a row can hold the end of one article and the start of the next.

A: It can. And with plain attention, a token in the second article can look back at the first. Most small training runs just allow that, and the end-of-text marker teaches the model that what came before is unrelated. For long-context training, where one row might hold dozens of unrelated documents, people use a mask so each document only sees itself.

B: And shuffling?

A: Shuffling matters more than you'd think here. The dump is roughly in the order articles were created. And all the French communes were created by the same bot in the same week. Train in dump order, and the model sees thousands of communes in a row, and the loss curve gets these weird drops and bumps every time it hits one of those runs. So you shuffle everything once, properly, when you write the files.

<!-- section: Better at what -->

B: So if I train one model on raw and one on clean, same number of tokens, the clean one wins.

A: On clean held-out text, it should win clearly. The raw model spent a big chunk of its budget on markup it never sees at test time, and it keeps putting probability on curly braces where there aren't any. But here's the question I like. What if you test both on raw held-out wikitext?

B: [working it out] Then the raw one wins. It's the only one that knows what comes after "cite web".

A: The raw one wins easily. And that's the real point. "Better" only means something against the text you evaluate on. So you decide what you want the model to be good at, before you choose the data. And it's the same thing for your ranker at work. Before you touch the model, dedupe the query and document pairs, make sure your eval queries didn't leak into training, and honestly, just read fifty random examples.

<!-- section: Ending -->

B: Okay, let me say it back. The model learns whatever text you give it, including the junk. So most of the work is deciding what's worth its tokens. Strip the markup, which is most of the file. Throw out stuff that isn't prose. Collapse the near-copies, which you find with MinHash because the chance of matching equals the similarity. Keep the test text out. And then shuffle and pack it. And cleaner data just makes a better model.

A: That's it, except the last line. Cleaner data makes a model that's better at clean text. Every one of those steps is a choice about what you want the model to be, and every one throws out some good text with the bad. The curly-brace rule cost C four all its code. Global dedup cost FineWeb good pages. So you don't trust a filter because it sounds right. You read what it threw away, and you train on the result and measure.
