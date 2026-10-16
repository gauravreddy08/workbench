<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you've trained your tiny language model on Wikipedia. The little one, around thirty million parameters, the GPT you built from scratch. And you sample from it. And it starts out fine. "The city is in the north of the country." Good sentence. And then it keeps going. Two curly braces, the words "cite web", a broken URL, "access date two thousand nine", two more curly braces, and then two square brackets and "Category: Cities in"... and it just stops there.

B: [amused] So it's writing Wikipedia's source code.

A: [dry] It's writing Wikipedia's source code. Because that's what you showed it. Wikipedia articles aren't stored as plain text, they're stored in a markup language called wikitext. Double square brackets make a link. Double curly braces call a template, which is like a little function that expands into a citation, or one of those info boxes on the right side of the page. And there are HTML-ish tags for references and tables. So the model learned, very faithfully, all of that. A good chunk of your token budget went into teaching a thirty-million-parameter model how to close curly braces.

B: Okay, so you strip the markup and train again.

A: You strip it, you train again, and it's better. But now some samples are, like, suspiciously fluent. Whole sentences, word for word, about French villages. "Omiécourt is a former commune. It is in Hauts-de-France in the Somme department in north France." Simple English Wikipedia has thousands of these stubs that are almost identical, and the model's memorised the template.

B: [skeptical] I mean, is that bad? It's producing correct English. Isn't that just the model being good?

A: [laughs] It's the model being a parrot. It saw that one sentence shape thousands of times, so it'll produce it whenever it gets the chance, instead of, you know, learning anything general. And then there's a third thing. Your validation loss looks great. Better than it should. And part of the reason is that some of your held-out articles share whole paragraphs with articles in the training set. So the model isn't predicting new text, it's remembering text it already saw.

B: Okay, so three problems. My instinct says a bigger model, or a better architecture, would kind of smooth over the rough edges.

A: [firmly] No, and that's the whole point. None of these is a modelling problem. You could swap in the fanciest architecture you can think of and every single one of these would still be there. The markup's still in the data. The stubs are still repeated. The leak's still leaking. That Anthropic research engineer posting that sent you here describes the job as "making Wikipedia data fit in a format a model can easily consume", and it says a lot of training "is about understanding the data". So that's this episode. That job, end to end, on a real Wikipedia dump, with a stopwatch on every stage.

<!-- section: Origin -->

A: [relaxed] And the history here is pretty short, it's basically five years. GPT two, in twenty nineteen, was trained on something called WebText. Which was web pages that had been linked from Reddit posts with at least three karma. And that's a crude filter, but it works surprisingly well. It basically means some human thought the page was worth sharing.

B: [laughs] Three karma is a low bar.

A: [amused] It's a low bar, but it's a human bar. Then Google's T five paper, released in twenty nineteen and published in twenty twenty, did something kind of unusual for the time. It actually published its cleaning rules. They built a dataset called C four, the Colossal Clean Crawled Corpus. They took one month of Common Crawl, which is a giant public scrape of the web, and they kept only lines that ended in punctuation. They dropped pages with fewer than five sentences. They dropped any page that had "lorem ipsum" in it, or a curly brace. Any page with a word from a bad-words list. And they deduplicated spans of three sentences that repeated. And then the paper showed that the cleaned version beat the unfiltered crawl.

B: Okay.

A: Then in twenty twenty, EleutherAI built The Pile, which went the other way. Eight hundred and twenty-five gibibytes, from twenty-two hand-picked sources. PubMed, arXiv, GitHub, books, Wikipedia. The theory being diverse, curated sources beat the raw web. In twenty twenty-one DeepMind's Gopher paper published a set of simple quality rules for web text, and honestly everyone still copies them. In twenty twenty-three RefinedWeb, which was built for the Falcon models, argued the opposite of The Pile: web data alone, if you filter and deduplicate it hard enough, can match the curated mixtures. And then in twenty twenty-four, Hugging Face released FineWeb. Fifteen trillion tokens. And, unusually, the experiments behind every single decision in the pipeline. Plus they showed that a small classifier, trained to score pages for "educational value", could pick out a subset, FineWeb-Edu, that beat much larger datasets on knowledge benchmarks.

B: [working it out] So over those five years the action kind of moved. From the model to the data.

A: That's the arc. The model architectures converged. Everyone's doing roughly the same transformer. And the datasets became the thing that separated a good model from a bad one.

<!-- section: The Idea: Garbage in, confidently out -->

A: So let's start with why. A language model is a machine that learns to predict the next token of whatever you feed it. Which sounds obvious, but follow it all the way through. It doesn't learn "English". It doesn't learn "facts". It learns the distribution of your training data.

B: And by distribution you mean...? I've heard that word a lot and I'm honestly never totally sure what it pins down.

A: [thinking it through] Fair. In plain words: for every bit of context, how often does each possible next token show up after it, in your data. That's it. If, in your data, "Category colon" is followed by "Cities in" a thousand times, the model learns to put probability there. It's not judging whether that's good text. It's just counting, in a very fancy way, what tends to come next in the stuff you gave it. So every quirk of the data becomes something the model spends capacity predicting. Markup it's never going to need to write. Boilerplate, like cookie banners, navigation menus, "This article is a stub. You can help Wikipedia by expanding it." It'll happily reproduce all of that.

B: And duplicates? I'd have assumed those are mostly a disk space problem. You're storing the same thing twice.

A: [jumping in] No, that's the part people miss. A duplicate is like a hidden learning-rate multiplier on whatever got duplicated. If a document appears a thousand times, it gets a thousand times the gradient. The model's being told, a thousand times over, "this exact text is really important". So it memorises it, instead of generalising from it. And then the last one: your test questions, if they leaked into training, make your evals lie.

B: Okay.

A: So there are three reasons data's the lever. One, capacity's finite. A small model can only learn so much, so every parameter you spend on curly braces is one you're not spending on grammar. Two, tokens are the budget. At a fixed amount of compute, you train on a fixed number of tokens, so cleaning means each of those tokens teaches more. And three, the effects are big. In the FineWeb experiments, swapping the data, same model, same number of tokens, moved benchmark scores about as much as a big jump in model size.

<!-- section: The Idea: The shape of a pipeline -->

A: Now, every serious text pipeline is roughly the same assembly line. And you can picture it in three rows. The top row decides what counts as text. That's acquire, so get the dump, then extract, which turns markup into plain text, then normalize, which cleans up the bytes. The middle row decides what to keep. Language ID, quality filters, deduplication, scrubbing personal info, and decontamination against your eval set. And the bottom row decides how to store it so a GPU never waits. Tokenize, pack into fixed-length rows, split into shards and shuffle, and then the trainer reads those rows. Documents go in the top, token shards come out the bottom.

B: And they all kind of do the same thing? Just at different levels?

A: [mildly] Not quite. Every stage does one of three things. It changes documents, like extract or normalize. It throws documents away, like the filters and dedup. Or it changes the format, like tokenize and pack. And the order matters. You put cheap filters first, so the expensive ones see fewer documents.

A: And we'll walk every stage on a real input. The Simple English Wikipedia dump. Same format as the full English one, but about twenty times smaller, so a full pass takes minutes on a laptop instead of hours.

<!-- section: The Idea: Acquisition -->

A: So, acquisition. Wikimedia publishes dumps on their dump site roughly twice a month, and the file you want is the "pages articles" one for simple wiki, which is X M L compressed with B zip two. When the file was fetched in October twenty twenty-six, it was three hundred fifty-eight megabytes compressed, and one point seven one gigabytes of X M L once you decompress it. So it grows about five times. Inside are five hundred sixty-two thousand pages. But only about two hundred eighty-five thousand of those are real articles.

B: What's the rest?

A: About a hundred fifteen thousand are redirects. A redirect is a page that just says "go to page X". Like "USA" pointing to "United States". It has no text of its own. And the rest are templates, categories, help pages, that kind of thing. Wikipedia sorts pages by kind into what it calls namespaces. Namespace zero is articles. The others hold talk pages, user pages, templates and so on. And every page in the X M L has a little field saying which namespace it's in.

A: So each page record is pretty simple. A title, like "Paris". The namespace, zero. An id number. And then a revision, and inside that, the text. Which is the raw wikitext. So for Paris it starts with a giant info box template with the population in it, then "Paris is the capital city of France" with links on "capital city" and "France", then a reference tag with a citation template inside it, and at the very bottom, a category tag, "Capitals in Europe".

B: [skeptical] And you just load the file and loop over the pages?

A: [laughs] You can't really load it. It's one giant X M L document. One point seven gigabytes as a single tree. A normal parser wants to build the whole thing in memory, as Python objects, which would be many times bigger than the file. So you stream it. You handle one page at a time and throw it away. Python's built-in X M L library has a function for this called iter parse. It hands you each element as it finishes. The catch is you have to call clear on each page once you're done with it, or Python keeps all of them around and memory grows with the file anyway.

B: Okay. And then you're off.

A: Then you hit the second practical fact, which is B zip two is slow. It's a compression format that squeezes text really well but decompresses slowly. A few tens of megabytes per second, per core. On an M four Pro, just decompressing the file took seventy-seven CPU seconds. And a full streaming pass that also parsed the X M L took about a hundred seconds on one core. That's your floor. A minute and a half, before you've done any real work at all.

A: Now there's a shortcut. Hugging Face has a dataset called wikimedia slash wikipedia that ships pre-extracted plain text as Parquet files. Parquet is a column-oriented file format. All the values of one column are stored together and compressed, so if you want just the text column out of a big table, you only read that. It's the standard format for tables sitting on disk. The dataset has one config per language and dump date, something like "twenty twenty-three eleven oh one dot simple". The names change, so check the dataset card. Use it when you just need text. But do it from the X M L at least once. Because extraction is where most of the decisions are. And, it turns out, most of the time.

<!-- section: The Idea: Extraction -->

A: So, extraction. Wikitext is basically a programming language that happens to contain prose. Here's a small example to hold in your head. Picture a little article about the Seine. On the left, the source. At the top, an info box template, "Infobox river, name equals Seine", all in curly braces. Then "The Seine" in bold, written with three apostrophes on each side. "Is a" and then "river", in square brackets, so that's a link. Then "in northern France", but the link is actually to the page "France", with "northern France" as the text you see. Then a reference tag wrapped around a "cite web" template. Then "It flows through Paris", with Paris linked. Then a table, starting with a curly brace and a pipe, with one row, "Length, seven hundred seventy-seven kilometres". Then a file, "Seine dot jpg, thumb". And at the bottom, "Category: Rivers of France".

B: And on the right?

A: [dry] On the right, the output is just two sentences. "The Seine is a river in northern France. It flows through Paris." That's it. Everything else is gone.

B: [surprised] That's a lot of stuff to get two sentences.

A: It is. And there are basically two kinds of thing in there. Links keep their visible text and lose the brackets. Everything else, templates, references, tables, files, categories, gets dropped whole. And the tricky part is these all nest. A reference contains a template. A table cell contains a link. A template's argument contains another template.

A: So with their real names. Templates are the double-curly-brace things. They're wikitext functions that expand into boxes, citations, dates, sometimes another page's content. Info boxes, citations, the "this article is a stub" banners, all templates. And almost all of them get dropped. A few do produce visible text, though. Dates. Unit conversions, like the one that takes "seven hundred seventy-seven" and "kilometres" and prints the length for you.

B: So you lose those? You'd just lose the number?

A: [matter-of-fact] You lose a little, yeah. That's a deliberate trade. Trying to expand every template properly is a huge amount of work for not much text. Then links: the target-and-shown-text kind becomes just the shown text, and a plain link to Paris becomes just "Paris". References, the footnotes, get dropped. Tables get dropped too, because a table flattened into text is a mess of numbers and pipe characters, and most pipelines just throw them out. Files and categories, dropped. And bold, italics, headings: you keep the words and lose the formatting. A heading that's written "equals equals History equals equals" just becomes "History".

B: Can't you do all that with a few regexes?

A: You can try. And nesting breaks regexes really fast. A reference inside a template inside a table, and your pattern matches the wrong closing brace. So there are two libraries that do it properly. One's called M W parser from hell. Real name. It parses wikitext into a tree you can walk and edit. The other's wikiextractor, the classic command-line tool that turns a whole dump into text files. And, honestly, real wikitext will still surprise you. You'll find leftovers and fix them by looking at samples. That's the actual skill here. Reading output.

A: And here's the first big number. If you tokenize the raw wikitext of all two hundred eighty-five thousand articles with GPT two's tokenizer, you get three hundred seventy-three million tokens. Guess how many tokens the extracted plain text is.

B: [working it out] Hmm. Markup's a lot, but most of an article is still words, right? So... maybe a third is markup? Two hundred fifty million?

A: [quietly] Sixty-nine million.

B: Oh. Huh.

A: So over eighty percent of the tokens in Wikipedia's source are markup. Info boxes, citation templates, tables, references. And it's actually worse than the characters suggest, because markup tokenizes badly. About two point eight characters per token, against about four point three for normal prose. All those brackets and pipes and short weird strings get chopped into little pieces. And extraction turned out to be, by far, the most expensive stage. Building a full parse tree of every article in Python is slow. Keep that in mind, because it'll come back when we time everything.

<!-- section: The Idea: Normalization -->

A: Next, normalization. And this is a weird one. The same visible string can be stored as different bytes. Take the word "café". It can be four characters: c, a, f, and then "e with an accent" as one single character. Or it can be five: c, a, f, a plain e, and then a separate invisible character that means "put an acute accent on whatever came before". They look identical on screen. But they compare unequal, they hash differently, and they tokenize differently.

B: So two copies of the same article can look the same and not be the same.

A: [agreeing] Exactly that. And the fix is called Unicode normalization. You rewrite text into one canonical byte form, so strings that look the same are the same. There are a few forms. N F C composes characters, so e plus accent becomes the single é. N F D does the opposite, it splits them apart. And you want N F C. It's what most text on the web already uses, and it's the safe default for training data. In Python it's one call in the unicodedata module. There's also N F K C, which goes further. It folds look-alikes, so the fancy "fi" ligature, where f and i are glued into one character, becomes two normal letters, and full-width digits from Asian text become normal digits. But it's more aggressive and occasionally changes meaning, so C four-style pipelines usually stick to N F C.

A: Then whitespace. Collapse runs of spaces and tabs into one space. Turn non-breaking spaces into normal ones. Strip each line. And collapse three or more newlines into two. But keep single and double newlines. A paragraph break is real structure, and you want the model to learn it.

B: And this matters because...? It feels a bit cosmetic.

A: It matters for what comes next. Dedup compares hashes. And one stray non-breaking space, which you can't even see, makes two identical documents hash differently.

<!-- section: The Idea: Language ID -->

A: Then language ID. Simple English Wikipedia is, unsurprisingly, almost all English. A web crawl isn't. So language identification, guessing which language a text is in, is the first filter in nearly every web pipeline. It's usually a tiny, fast classifier trained on character n-grams, meaning short runs of characters, like "th" or "ing", and it gives back a language label and a confidence. The standard one is fastText's language ID model from Facebook, twenty seventeen. A hundred seventy-six languages, under a megabyte in its compressed form, and fast enough to run on billions of documents. FineWeb keeps a document if fastText says English with probability at least zero point six five. C four used a different detector and wanted zero point nine nine.

A: On Simple English Wikipedia it removed four thousand and eighty-four articles. One point four percent. And if you actually read them, most are English.

B: [skeptical] Most of the "not English" ones are English?

A: Yeah. Here's one. "Lys, Pyrénées-Atlantiques is a commune of the Pyrénées-Atlantiques département in the southwestern part of France." That scored zero for English.

B: Zero. Not low. Zero.

A: [amused] Zero. Because it's one short sentence, and half of it is French place names. To a model that looks at runs of characters, that looks French. So language ID is unreliable on short text that's full of names. On the web, where it's removing a big chunk of everything, that error rate is fine. On a curated English corpus, you'd lower the threshold, or skip short documents. Measure before you trust it.

<!-- section: The Idea: Quality filtering, rules -->

A: Now the hard question. What's "good" text? Nobody has a definition. So pipelines use proxies, starting with simple rules that catch obvious junk. And the Gopher rules are the ones everyone copies. So, roughly. Length: keep documents between fifty and a hundred thousand words. That catches stubs and error pages at one end, and giant data dumps at the other. Mean word length: between three and ten characters. That one catches lists of numbers, base sixty-four blobs, and what you might call URL soup.

B: [amused] Base sixty-four would have a pretty long average word, yeah.

A: [laughs] One enormous word. Then symbols: fewer than one hash sign or one "dot dot dot" per ten words. That's for hashtag spam and truncated previews. Then bullets and ellipses: under ninety percent of lines starting with a bullet, and under thirty percent ending in "dot dot dot". That catches navigation menus, listicles, teaser pages. Then at least eighty percent of words have to contain a letter, which catches tables of numbers, code, coordinates. Then stop words: the document needs at least two of a small list. The, be, to, of, and, that, have, with. And repetition: not too many duplicated lines, paragraphs, or repeated phrases. That catches spam, templated pages, "click here" fifty times.

B: The stop word one sounds almost silly.

A: It looks silly and it works really well. Stop words are just the commonest little words in a language. The, of, and, to. Real sentences are full of them. Lists, tables, and keyword spam aren't. So when they're missing, that's a strong sign it isn't really prose.

A: And C four's rules are in the same spirit. Lines must end in a full stop, question mark, that kind of punctuation. Lines need at least three words. Pages need at least five sentences. Any line mentioning JavaScript gets dropped, because that's the "please enable JavaScript" warnings. And any page with "lorem ipsum" or a curly brace goes.

B: [jumping in] Wait, a curly brace? That'd kill basically every page with code on it.

A: [agreeing] It does. That's why C four contains almost no code. And that's the general point. Every rule throws out some good text along with the bad. The question is always the trade, and the only way you really find out is by training on the result.

A: One rule needs special care on Wikipedia, and it's length. Simple English Wikipedia has a huge number of stubs, one or two sentences long. They're not wrong. They just don't teach much. And a lot of them are templated, which, hold onto that for dedup. A fifty-word minimum removes a big share of documents but a small share of tokens. Because short documents are, well, short.

<!-- section: The Idea: Quality filtering, a model as the judge -->

A: Rules catch junk. But they can't tell a mediocre forum post from a great textbook paragraph, because both pass every rule. So the modern answer is to train a small quality classifier. A cheap model that reads a document and outputs a score, trained on examples labelled good or bad. The labels can come from humans, from a reference corpus, or from a bigger language model.

A: The older version of this is GPT three, in twenty twenty. They trained a classifier to tell Common Crawl pages apart from a "known good" reference set, which was WebText, books, and Wikipedia. And then kept web pages that looked like the reference. FineWeb-Edu made it sharper. They asked Llama three seventy B Instruct to rate about four hundred fifty thousand web pages from zero to five for "educational value for primary to grade school students". Then they trained a small regression head on top of a sentence-embedding model to predict those ratings.

B: Hang on. So they ran a seventy-billion-parameter model over fifteen trillion tokens? That sounds insanely expensive.

A: No, and that's the trick. The big model only labelled the sample. Four hundred fifty thousand pages. Then the small, cheap model learned to imitate it, and that's what ran on all fifteen trillion tokens. Keeping pages that scored three or more left about one point three trillion tokens. And models trained on that did noticeably better on knowledge and reasoning benchmarks, M M L U and ARC.

A: Two cautions, though. A classifier filter is a taste, and you inherit the judge's taste. FineWeb-Edu is great for school knowledge, and not obviously better for, say, conversation, or code. And the classifier can't be the same thing you evaluate with, or you're grading your own homework. On Wikipedia this stage matters less, since it's all encyclopedic already. So the build uses rules only, and leaves the classifier as an extension.

<!-- section: The Idea: Deduplication, exact -->

A: Now dedup. The cheapest kind is exact. You hash each normalized document, with S H A one or anything fast and wide enough that collisions don't matter, and keep the first document for each hash. One pass. And you only store the hashes, which are twenty bytes each. So ten million documents is a two-hundred-megabyte set. That's nothing. That fits in RAM on one machine without thinking about it.

A: Exact dedup catches mirror copies and reposts, and on the web there are tons of those. On Wikipedia it found almost nothing. A hundred eighty-six articles. Mostly pairs like "Amenia, town, New York" and "Amenia, C D P, New York". Or three Japanese footballers whose one-line articles became identical once their info boxes were stripped out.

B: [laughs] So the info box was the only thing that made them different.

A: [laughs] The info box was their whole personality. But the real problem isn't documents that are a hundred percent the same. It's documents that are ninety-five percent the same.

<!-- section: The Idea: Deduplication, near: MinHash -->

A: So here's the scene. Simple English Wikipedia has thousands of articles generated from one template. French communes, Italian municipalities, asteroids, US counties. Each one differs from the others by a name and maybe a number or two. They're not exact duplicates, so hashing misses them. But to the model, they're the same lesson repeated thousands of times.

A: To catch them you need a notion of "similar", and you need it to work at scale. So first, the notion. Turn each document into a set of shingles. A shingle is just a run of k consecutive words, overlapping. So "the cat sat on", with k equals three, gives you two shingles. "The cat sat", and "cat sat on". Then compare two documents by Jaccard similarity. That's the number of shingles they share, divided by the number of distinct shingles across both of them together.

B: So if they have, like, ten shingles each and share eight...

A: Then together they've got twelve distinct ones. Eight shared, plus two only in the first, plus two only in the second. Eight out of twelve, so about zero point six seven. One means identical sets, zero means nothing in common. And two template stubs that differ in one name share most of their shingles. Two unrelated articles share almost none.

A: Now the scale problem. Two hundred eighty-five thousand documents means about forty billion pairs. Comparing every pair's shingle sets is hopeless. And for a web crawl with a hundred million documents, it's absurd.

B: [skeptical] Forty billion's a lot, but couldn't you just throw a GPU at it?

A: You could throw a lot of hardware at forty billion. But the number of pairs grows with the square of the documents, so ten times the documents is a hundred times the pairs. You'll never win that race. You need to not do most of the comparisons at all. And this is where MinHash comes in, and it's honestly kind of beautiful.

A: [slowly] So imagine taking every possible shingle in the world, and shuffling them into one random order. One giant list. Now for each document, look at its shingles, and write down which one comes first in that big shuffled list. Call that the document's "min". Now, what's the chance that two documents have the same min?

B: I'd have guessed... basically random? Like, it depends on how the shuffle fell.

A: [intrigued] It is random. But the chance is very specific. Look at the union of their two sets. All the shingles that are in either document. Whichever one of those comes first in the shuffle, it's equally likely to be any of them. Now, if that first one is a shingle they share, then both documents report it as their min. They match. If it belongs to only one of them, then that document reports it, and the other one reports something else. No match. So the chance of a match is the number of shared shingles divided by the number of all shingles in the union.

B: [working it out] Which is... the Jaccard similarity. Oh. That's the same fraction.

A: That's it. Back to the example. Twelve shingles in the union, eight shared. The first one in the random order is equally likely to be any of the twelve. Eight times out of twelve it's a shared one, and they match. So one random shuffle gives you a coin that lands "match" with probability exactly equal to the similarity. Now flip that coin with a hundred twenty-eight different shuffles, and the fraction of matches estimates the Jaccard similarity.

B: But you can't actually shuffle every shingle in the world.

A: Right, so you fake it with a hash function. Hash each shingle with a seeded hash, and take the smallest value. A different seed is like a different shuffle. And that list of a hundred twenty-eight minimums is the document's MinHash signature. A short, fixed-length list of numbers that summarises the whole shingle set. To compare two documents, you count in how many positions their signatures agree. That fraction is your estimate.

A: There's a little interactive version of this you can play with. Two text boxes, one per document, with presets. The first preset is two of those French commune stubs, Omiécourt and Hyencourt-le-Grand, word for word the same except the name. Underneath, the shingles show up as little chips, coloured by whether they're in both documents or just one. Then there's the true Jaccard, the MinHash estimate, and a row of cells, one per hash function. A cell fills in when both documents picked the same shingle as their minimum. And there's a slider for how many hash functions, from one to two hundred fifty-six. If you drag it down to four and keep hitting "new random hashes", the estimate jumps all over the place. At a hundred twenty-eight, it's usually within about zero point zero five of the truth.

A: Which raises a fair question. How far off should you expect it to be? Say two documents have a true similarity of zero point five four. You compute signatures with sixteen hashes, and then with a hundred twenty-eight. Roughly how far off is each estimate?

B: Hundred twenty-eight is eight times as many. So eight times more accurate? If sixteen's off by, I don't know, zero point one, a hundred twenty-eight would be off by about zero point zero one?

A: [gently] That's the natural guess, and it's too optimistic. Each hash is a coin flip that lands "match" with probability point five four. So the estimate is just the average of k coin flips. And averages tighten up with the square root of how many you take, not linearly. The typical error works out like this: take the similarity, times one minus the similarity, divide by k, and take the square root. So, point five four times point four six is about a quarter. Divide by sixteen, square root, and you get about plus or minus zero point one two. Do it with a hundred twenty-eight and you get about zero point zero four four. And this was checked with the datasketch library over a hundred random seeds. The measured spreads were zero point one two nine at sixteen hashes, zero point zero six two at sixty-four, zero point zero four four at a hundred twenty-eight, zero point zero two nine at two hundred fifty-six. Right on the formula.

B: So eight times the hashes buys me...

A: Square root of eight, about two point eight times the precision. And that square root is why people stop at somewhere between a hundred and two hundred fifty hashes. Past that you're paying a lot for very little.

<!-- section: The Idea: LSH -->

B: Okay, but signatures make each comparison cheap. There are still forty billion pairs.

A: Right. A hundred twenty-eight numbers instead of thousands of shingles, but forty billion times. So there's a second trick, called locality-sensitive hashing. L S H. The idea is to hash items so that similar ones are likely to land in the same bucket and different ones aren't. And then you only compare items that share a bucket.

A: Here's how. Take each hundred-twenty-eight-number signature and cut it into bands. Say nine bands of thirteen numbers each. For each band, hash those thirteen numbers into a bucket. Two documents become a candidate pair if they land in the same bucket for at least one band. And only candidate pairs ever get compared. Everything else is assumed not similar and never looked at.

B: [skeptical] Why would that catch the right pairs, though?

A: So, think about one pair, with similarity s. Each position in the signature matches with probability s. For one whole band to match, all thirteen positions in it have to match. So that's s multiplied by itself thirteen times. Take a pair that's zero point nine similar. Point nine to the thirteenth is about a quarter. So any one band matches about a quarter of the time. But there are nine bands, and the pair only escapes if every single one of them fails. Three quarters, nine times over, is only about seven percent. So the pair gets caught about ninety-three percent of the time.

B: And a pair that's only, like, half similar?

A: Point five to the thirteenth is about one in eight thousand. Even with nine chances, that's about one in nine hundred. Basically never. So if you plot it, similarity along the bottom and the chance of becoming a candidate going up, you get an S-curve. Flat near zero, then a fairly sharp step up, then flat near one. And the step sits at a spot you can work out from the number of bands and rows. For nine by thirteen it's around zero point eight five. Choosing the bands and rows is choosing where that step sits.

A: There's an interactive version of that curve too. Sliders for bands and rows, with a dashed line showing the ideal filter, a perfect vertical step. And three buttons for real settings. If you drag rows up, the step moves right. Stricter. If you add more bands, it moves left and gets sharper.

A: And the two real settings worth comparing. The datasketch library, if you ask for a threshold of zero point eight with a hundred twenty-eight hashes, picks nine bands of thirteen. Which catches a point nine pair ninety-three percent of the time. And a point eight pair only forty percent of the time.

B: [surprised] Forty percent? At the threshold I asked for?

A: Yeah. Because it places the step to balance false positives against false negatives, not to catch everything at point eight. Worth knowing before you trust it. FineWeb used a hundred twelve hashes in fourteen bands of eight, with five-word shingles. So a pair that's zero point seven five similar gets caught about seventy-seven percent of the time. And each bucket lookup is just a dictionary access, so the whole thing is roughly linear in the number of documents. Not the square.

A: Once you've got candidate pairs, you either trust them or verify them. Compare their full signatures, or even the real shingle sets. Then you group documents into clusters of near-duplicates. And the perfect tool for that is union-find. It's a tiny data structure that merges items into groups as you discover "these two belong together", and can tell you any item's group quickly. Then you keep one document per cluster.

A: Okay, so guess. Wikipedia's curated by humans. What fraction of Simple English Wikipedia articles do you think MinHash flags as near-duplicates of another article? At a similarity of at least point eight, on five-word shingles. A tenth of a percent? One percent? Ten?

B: Humans wrote it, people check it... I'll say a tenth of a percent. Maybe less.

A: [amused] Four point seven percent. Run on its own over the extracted text, near-dedup removed thirteen thousand four hundred sixty-eight documents. From thirteen hundred and fifty-five clusters, holding fourteen thousand eight hundred twenty-three articles. And the biggest clusters are exactly the bot-written stubs. Six hundred eighty-eight French communes in one department. Five hundred eighteen in another. Four hundred forty-seven in a third. A typical pair, word for word apart from the names: "Gagyapáti is a village in Encs District in Borsod-Abaúj-Zemplén County, Hungary. In twenty twenty-four, thirty-three people lived there." And then the same sentence for a village called Litka.

B: [laughs] So humans curate it, but bots wrote a lot of it.

A: Bots and templates write a lot of Wikipedia. And then there's a twist. If you run the length filter first, near-dedup only removes fifty-six more documents.

B: Fifty-six? Out of thirteen thousand?

A: Because the stubs were short. The length filter had already thrown almost all of them out. Filters overlap, and the order you run them in decides which one gets the credit. On web crawls, dedup removes way more, because there, long pages get copied too.

A: And one subtle FineWeb finding that's worth knowing. Common Crawl comes out in snapshots, and they had ninety-six of them. They expected that deduplicating across all ninety-six at once would be best. It wasn't. Deduplicating each snapshot separately trained better models.

B: [skeptical] How is less dedup better? I'd assume more dedup is always cleaner.

A: Because global dedup removed a lot of good content that genuinely shows up in many crawls. And it shows up in many crawls because it's good. People copy good pages. So what survived skewed toward junk, the stuff nobody bothered to copy. Dedup's a tool, not a virtue. You measure it.

<!-- section: The Idea: PII scrubbing -->

A: Then P I I. Personally identifiable information. Email addresses, phone numbers, street addresses, ID numbers. Anything that points to a real person. Models can memorise it and repeat it. The baseline is regexes for emails, phone numbers and IP addresses, and you replace each match with a placeholder, like a tag that just says "email", rather than deleting the document. Bigger pipelines add named-entity models on top.

A: Now, an encyclopedia has very little real P I I, by design. And yet two naive regexes, one for emails and one for "ten or more digits with separators" as a phone number, fired sixty-six thousand two hundred and seven times in five thousand articles.

B: That's like thirteen per article. In Wikipedia?

A: And almost none of them were phone numbers. They were population figures, sports statistics, date ranges, I S B Ns. A phone regex that's loose enough to catch every phone format eats every long number. So look at what it matches before you let it rewrite your data.

<!-- section: The Idea: Decontamination -->

A: Next, decontamination. You'll evaluate your model on some held-out text, or a benchmark. If any of that text is in the training set, the eval measures memorisation, and you'll believe something that isn't true. That's called contamination: test examples, or near-copies of them, showing up in the training data. And it's really easy to cause on Wikipedia, because a lot of benchmarks are built from Wikipedia. SQuAD, Natural Questions, the TriviaQA contexts. And articles quote each other.

A: The standard check is n-gram overlap. Two texts share an n-gram if some run of n consecutive words appears in both. And with n somewhere around eight to thirteen, a shared run is very unlikely to be coincidence. So you collect every thirteen-word sequence in your eval set into a hash set. Then for each training document, you check whether any of its thirteen-word sequences is in that set. If so, you drop it. Or you drop just the overlapping part. GPT three's paper used thirteen. Other papers use anywhere from eight to fifty. Shorter catches more, but it starts flagging common phrases. "In the United States of America" is already seven words. Thirteen is long enough that coincidences are rare.

A: In the build, you hold out one percent of articles as a clean eval set. And then you decontaminate the rest against it.

B: [skeptical] I mean, that sounds kind of pointless, though. They're different articles. You picked them out yourself. How can the training set contain them?

A: [dry] That was the expectation. And then four thousand seven hundred sixty-five training articles, out of about a hundred seventy-two thousand that survived the filters, shared at least one thirteen-word run with the seventeen hundred forty-eight eval articles.

B: Huh.

A: And if you look at which runs, it splits into two kinds. The first kind is template sentences. The most-shared ones were "the united states census bureau says that the city has a total area of", in two hundred sixty-four flagged articles. "Is a former japanese football player he played for the japan national team", two hundred thirty-two. And "scientists from the iucn say this frog is not in danger of dying out", a hundred eighty-four.

B: [laughs] The frog one.

A: Bots wrote thousands of articles from that sentence. And that's not a fact leaking. But a model that's seen the sentence two thousand times will predict it perfectly in the eval set, so it still inflates your eval scores. The second kind is real copying. The article "Ring, mathematics" shared two hundred fifty-three of its six hundred sixty thirteen-word runs with "Field, mathematics", which was in the eval set. Whole paragraphs of definitions copied from one article to the other. And a set of N H L season articles shared over half their runs with one held-out season. That's the leak that made the validation loss in the opening look too good.

A: So a single shared thirteen-word run is a blunt rule. Real pipelines either remove just the overlapping spans, or only flag a document when a meaningful fraction of it overlaps. Dropping everything flagged, the blunt way, costs three point six percent of your tokens. You decide whether that's worth it for your eval.

A: And there's a nice interactive view of the whole funnel from this run. Each filter is a row with an on-off toggle, and there's a switch between counting tokens and counting documents. Every combination of toggles was computed from the real pipeline output, so you can ask "what if I didn't dedup?" and get the honest answer, not a guess. And three things jump out. In tokens, extraction alone removes more than half of everything. Switch to documents, and the length filter removes a huge chunk, while in tokens it barely moves. And near-dedup removes few documents, but the ones it removes are the repetitive ones.

<!-- section: The Idea: Tokenizing at scale -->

A: Okay, so now the text's clean, and you turn it into token IDs. And this is the easy part, if you set it up right. Because it's embarrassingly parallel. Every document tokenizes independently.

B: So you'd use threads. Spin up a bunch of threads, each one grabs documents.

A: [gently] For plain Python code, threads don't help. That's the GIL. The global interpreter lock. Only one thread can run Python code at a time inside one process. So for CPU-heavy Python, you use worker processes instead. Each process has its own interpreter and its own lock, so they actually run in parallel on different cores. And tokenizing is the textbook case: CPU-bound, no shared state. Give each worker process a chunk of documents.

B: Okay, so processes.

A: Processes, usually. But here's the twist. If your tokenizer's core is written in Rust, which is true for Hugging Face's tokenizers library, and for tiktoken under its Python skin, it releases the GIL while it's working inside a batch call. So threads work too. And the numbers. Measured on a Mac with tiktoken's GPT two encoding: about two point three million tokens per second on one thread. About ten million tokens per second with the batch call and eight threads. And on the full run, all sixty-nine million clean tokens took eight point three seconds with ten threads.

B: Eight seconds. For the entire clean dataset.

A: [amused] Eight seconds. Tokenizing is not where your time goes. Keep that in mind too.

A: Two more things. Send paths, not data. Same rule as in the processes lesson. If the parent process reads all the text and ships it over to the workers, it has to pickle it, which means turn it into bytes, copy it across, and turn it back. And that copying costs more than the tokenizing. So instead, give each worker a file name and a byte range. It reads its own piece, tokenizes it, writes its own output file, and the parent only collects file names.

A: And after each document, you append the end-of-text token. E O T. It's a special token ID, fifty thousand two hundred fifty-six in GPT two's vocabulary, that marks where one document ends and the next one starts. It's how the model learns that a boundary means "new topic, forget the old one".

A: And a useful sanity number. On the clean Simple English text, GPT two's tokenizer averaged about four point three characters per token. English prose with a GPT two-style tokenizer lands around four characters per token. Raw wikitext lands lower, because markup is full of short, rare character sequences.

<!-- section: The Idea: Packing -->

A: Now packing. The trainer wants a rectangle. B rows of exactly T tokens each, say T is one thousand twenty-four. But documents are every length. The naive way is one document per row, padded out with a pad token up to a thousand twenty-four. And on Wikipedia, where most documents are short, most of every batch would be padding.

B: [skeptical] But the padding gets masked out, right? So the model doesn't learn from it. Is that actually a problem?

A: [patiently] The mask stops it from learning from the padding. It doesn't stop the GPU from computing it. You're still running every one of those pad positions through the whole model. It's compute spent on nothing. So the fix is sequence packing. You concatenate everything end to end, with the end-of-text separators in between, into one long stream. Then you chop that stream into rows. No padding at all. A row might hold several documents, or part of one.

A: And that raises a question. Picture four documents, A, B, C and D. A's four tokens long, B's three, C's seven, D's five, and each one ends with an end-of-text token. Lay them end to end, and cut the stream into rows of twelve. So the first row holds all of A, all of B, and the start of C, and C spills over into the second row. Now, in that first row, should a token in document B be allowed to look back at document A? A just happens to sit before it in the same row.

B: I mean, they're unrelated. So, no?

A: There are two answers, and both get used. Picture two little grids for that first row. Each grid has a row for every token that's looking, and a column for every token it could look at. The first grid is plain causal attention, which is a triangle. Every token can see everything before it in the row. So yes, B's tokens see A. That's what GPT two and nanoGPT do. It's the simplest and fastest, and the end-of-text token teaches the model that whatever came before a boundary is unrelated. Most small-scale training does this, and it works fine.

A: The second grid is a document mask. Instead of one big triangle, it's little triangles down the diagonal, one per document. Each token only sees its own document. It's cleaner. The model doesn't have to learn to ignore junk context. And it matters more for long-context training, where one row can hold dozens of unrelated documents. Meta's Llama three paper says they used a mask that stops attention across documents within a sequence. But it needs support in the attention kernel. FlashAttention has a "var len" interface, for variable length, where instead of a mask matrix you hand it the document boundaries, as running totals of the sequence lengths. And PyTorch's FlexAttention lets you write it as a mask function.

B: And position numbers? If B starts halfway through a row...

A: You have to decide that too. You can restart the position IDs at zero for each document, which is natural with a document mask. Or keep counting across the whole row, which is natural with plain causal. And with packing, a document longer than a row just spills into the next one. You lose a little context at the cut. It doesn't matter much.

<!-- section: The Idea: Shards, shuffling, and the file on disk -->

A: Then the file on disk. Its one job is to let the trainer read random batches as fast as the GPU eats them, without ever loading the whole dataset into RAM. And the simplest format that works is what nanoGPT uses. All the token IDs, in one flat binary file of unsigned sixteen-bit integers. Nothing else. No headers, no text.

B: Why sixteen-bit?

A: Because GPT two's vocabulary has fifty thousand two hundred fifty-seven tokens, and a sixteen-bit unsigned integer holds zero up to sixty-five thousand five hundred thirty-five. So every token fits, and costs exactly two bytes. A hundred million tokens is two hundred megabytes.

B: [working it out] So the clean set here, fifty-six million tokens or so, would be about a hundred and twelve megabytes.

A: About that, yeah. Small. And the trainer opens it with numpy's memmap. That's memory mapping. You might remember it from virtual memory. The operating system makes the file look like it's already sitting in your program's memory, but it only actually loads a page of it, a few kilobytes, the moment you touch that part. So the trainer just picks random starting points and slices out a run of tokens. No parsing, no decoding, and the OS pulls in only the bytes you touched. And if your vocabulary's bigger than sixty-five thousand five hundred thirty-six, like Llama three's hundred twenty-eight thousand, you need thirty-two-bit integers, and the file doubles.

A: At bigger scale you split that into shards. Many files of a fixed size, each one a few hundred megabytes, say a hundred million tokens each. Shards let many data-loader workers, and many machines, read different parts in parallel. A failed write only loses one piece. And you can resume after a crash by remembering which shard and which offset you were at.

A: And there are a few other formats you'll run into, depending on what you're doing. The raw token file with memmap is for pretraining from already-tokenized data. Fastest and simplest. Arrow and Parquet are columnar tables, and they're for when you want text plus metadata, like the URL, the quality score, the language, so you can filter and inspect. Hugging Face's datasets library stores Arrow on disk and memory-maps it. WebDataset is shards that are just plain tar files of samples, read straight through, and it's for streaming from object storage like S three, especially images plus text. And Mosaic Streaming is shards built for deterministic, resumable streaming from cloud storage, so multi-node training from S three that can resume exactly where it stopped.

A: Now shuffling. Wikipedia's dump is roughly in the order articles were created. And similar articles cluster, because all the French communes were created by the same bot in the same week. If you train in dump order, the model sees three thousand communes in a row, and its loss curve will tell you about it. You want each batch to look like a random sample of the whole dataset.

A: The ideal is a global shuffle: every example in the whole dataset in one uniformly random order. Statistically perfect, but it needs random access to everything. And with a memmapped token file you get it nearly for free, because picking random offsets is a global shuffle. Streaming formats do a local shuffle instead. Read the shards in a random order, keep a buffer of a few thousand examples, and pull random ones out of the buffer. It's cheap. But it only mixes what fits in the buffer. So if your shards themselves are sorted, like all the communes in shard seven, the buffer has to be bigger than a whole cluster. Or you shuffle once, properly, when you write.

B: So which do you actually do?

A: Both. Shuffle the documents globally once, when you write the shards. It's a one-time cost. Then do a cheap local shuffle at read time. And seed everything, so a resumed run sees the same order.

<!-- section: The Idea: Mixtures and epochs -->

A: Last idea. Real training data comes from several sources. Web, code, books, papers, Wikipedia, math. And the data mixture is the proportions you sample them in. Like half web, a fifth code, a tenth books. And that's chosen separately from how much of each source you actually have. Small, high-quality sources like Wikipedia and books often get up-sampled, so they're seen several times in one run. Huge noisy ones get down-sampled. Meta reported Llama three's final mix as roughly half general knowledge, a quarter math and reasoning, seventeen percent code, and eight percent multilingual. Mixtures are mostly found by trial: train small models on different candidate mixes and compare. And there's research on learning them automatically, like DoReMi, from twenty twenty-three.

B: How many times can you actually repeat the same data before it hurts?

A: Muennighoff and others, in twenty twenty-three, trained hundreds of models on repeated data and found that up to about four passes, four epochs, is almost as good as fresh data. After that the value falls off steeply. So up-sampling Wikipedia two or three times is common. Repeating it forty times is not.

A: Okay, so put the whole thing together. You train two identical tiny models for exactly the same number of tokens. One on raw wikitext, one on the cleaned, deduplicated text. And you evaluate both on clean held-out text. Which one wins? And then: which wins if you evaluate both on raw held-out wikitext?

B: On clean text, the clean one, obviously. On raw... also the clean one? It's the better model.

A: [warmly] First half, yes, and clearly. A big chunk of the raw model's budget went into markup it never sees at eval time. And it keeps putting probability on curly braces and square brackets and pipes in places where clean text never has them, which costs it loss on every clean token. You'd expect a gap of a few tenths of a nat at this small scale. A nat's just the unit the loss is measured in when you use natural logs. But check it yourself, it depends on model size and token budget.

A: The second half, though. On raw held-out text, the raw model wins. Easily. It's the only one that knows what comes after "cite web". The clean model has never seen it.

B: [working it out] So there's no "better model" in general. It's better at the distribution you test it on.

A: That's the core lesson of evals. "Better" is defined by what you evaluate on. So you decide what you want the model to be good at, before you choose the data.

<!-- section: Build It -->

A: So here's what you'd actually build. It's about an evening for the pipeline and another evening for the two training runs. A folder in your workbench, a virtual environment with numpy, M W parser from hell, datasketch and tiktoken, and optionally fastText with its language model. You build the pipeline on your Mac, where it fits easily, and copy the shards to the Spark for training.

A: And there's one structural idea that makes the whole thing manageable. Every stage is a function from one document to one document, or to nothing, if it's thrown away. Those run in a pool of worker processes. Then there's a small amount of global work in the parent process, the stuff that has to see everything at once: exact dedup, L S H, decontamination. And from the very start, you log the time spent in every stage, per document. You'll need those numbers.

A: First step's just setup. You download the dump and stream the X M L once, writing one line of JSON per article. Only namespace zero, no redirects, and clear each page as you go. That way later stages don't have to pay the B zip two cost again. You'd get around two hundred eighty-five thousand articles and a one point one gigabyte file.

A: Then extraction and normalization, which is yours to write, and it's the part to really own. You parse the wikitext, remove the top-level templates, remove tags like references, tables, galleries, math, and remove links that point at files, images, categories or media. Then a strip-code call turns the remaining links into their visible text, and you drop any leftover table lines. Small practical thing: removing a node that was already removed as part of its parent throws an error, so catch it. But the part that matters is this. Print twenty random extracted articles, and actually read them. You'll find stuff. Stray "thumb" fragments from image captions. Empty "References" headings. Little empty parentheses where a template used to sit inside brackets. Fix the common ones, stop when the junk is rare, and write down what you fixed. Then compare token counts. You should keep about eighteen percent of the raw tokens.

A: Then the filters. Your function returns a flag for every rule a document fails. Shorter than fifty words, mean word length outside three to ten, fewer than eighty percent of words containing a letter, fewer than two distinct stop words, more than thirty percent of lines repeated.

B: Why all the flags? Couldn't you just stop at the first one that fails?

A: You could, but then you can't answer "how many documents fail only the letters rule?" And you can't toggle a rule off later without rerunning everything. That's what the funnel needs. Language ID's optional: keep a document if fastText's top label is English with probability at least zero point six five, and replace newlines with spaces first, since fastText predicts one line at a time. Under NumPy two, its normal predict call errored, and a lower-level call worked, so check the current package first. Then print five random documents that fail each rule, and ask whether the rule's doing what you think. In the reference run, the stop-word rule fired the most, about thirty-five thousand times. Mostly on articles that are one sentence plus a table of statistics, like a footballer's club career. And the length rule caught about a hundred thousand stubs.

A: Then MinHash. You write it yourself first, and check against datasketch. Shingles are lowercased five-word runs. You hash each shingle to a big integer, and then the cheap way to get a hundred twenty-eight different "shuffles" is: multiply by a random number, add another random number, and take the remainder after dividing by a huge prime. Specifically a Mersenne prime, two to the sixty-one, minus one. Different random pairs give you different orderings. Then take the minimum. And there's a classic bug: that multiplication overflows if you do it in sixty-four-bit numpy integers, and it silently wraps around. So use Python's big integers, or smaller hashes so the product fits. Then the L S H keys, one per band. In the parent, a dictionary from bucket to the list of documents in it, then union-find over the candidate pairs, verified by requiring their signatures to agree in at least eighty percent of positions. Keep the first document in each cluster.

A: When you check against datasketch, watch out: version two point oh changed how you rebuild a MinHash from stored hash values, so read the docs for your installed version. Have an agent review your code for that overflow bug, and for a band hash that accidentally ignores some of its rows. And then print the five biggest clusters by title. You'll recognise them immediately.

B: [amused] French communes.

A: French communes. Then the held-out set and decontamination. You pick the eval set before any filtering decisions can leak into it. One percent of articles, chosen by hashing the article's id with M D five and taking the ones where the result, modulo a hundred, is zero.

B: Why M D five? Why not just Python's built-in hash?

A: [quickly] Because Python's built-in hash for strings is randomised every time you start a new process. Different runs would pick a different one percent, and so would different workers. M D five gives the same answer every time, everywhere. Then you keep only eval articles that pass the quality filters, so it's a clean eval set, and you never, ever train on them. Build the set of every thirteen-word run in the eval set, storing just a hash of each to save memory. Flag every training document that shares one, and print ten flagged pairs side by side, and decide for each one whether it's real leakage. Then the two P I I regexes. Print twenty matches. Is your phone regex eating years and I S B Ns? Tighten it.

A: Then tokenizing and sharding. A worker function reads one chunk of clean documents, encodes each one, appends the end-of-text token, glues them all into one array of sixteen-bit integers and writes it to disk. The main part does a seeded global shuffle, splits the documents into about four chunk files per worker, and maps the worker function over a process pool. Paths in, counts out. Then you concatenate the outputs into a train file, and an eval file from the held-out set. Or keep them as shards of fifty million tokens or so. And one safety check: before casting to sixteen bits, assert every token ID is under sixty-five thousand five hundred thirty-six, or you'd silently wrap.

A: And the reader the trainer uses is tiny. Memmap the file. Pick B random starting points. For each one, take T tokens as the input, and the same T tokens shifted one step to the right as the target. Because the target for each position is just the next token. That's the whole data loader.

A: And you also build a raw version. Tokenize the raw wikitext, no extraction, no filters, no dedup, into a raw train file the same way. That's the baseline.

A: Then the timing. Wrap each per-document stage in a high-resolution timer, sum the CPU time per stage across all the workers, and measure the global stages and each pool's wall-clock time separately. If you want to see what a worker's doing while it runs, py spy can attach to a running process and show you which functions are hot.

A: And the last task's the payoff. On the Spark, you train two identical models from the tiny LM lesson. One reads the raw file, one reads the clean one. Same architecture, same seed, same batch size, and the same number of training tokens. Repeating the clean set up to about two epochs is fine, if you need to. Something like six layers, three hundred eighty-four wide, five-hundred-twelve-token context, fifty to a hundred million tokens is enough to see the effect in about an hour. You evaluate both every few hundred steps on the clean eval file, and also on a raw-wikitext version of the same held-out articles. Four curves, two models times two eval sets, on one plot. Sample five completions from each with the same prompts. And have an agent check the training script for unfairness: different token counts, different eval batches, or either model training on eval data.

A: And you're done when you can state the train, raw, and eval files' token counts and sizes in megabytes without looking, name the five biggest clusters, show one contaminated pair, say which stage dominates the time and why, and you've got those four curves.

<!-- section: Measure -->

A: Okay, so where does the time go. The reference run was on an M four Pro. Ten performance cores, four efficiency cores, ten worker processes. And there were other heavy jobs running at the same time, so the absolute numbers are pessimistic. The ratios are the point. Before I give you the numbers, which stage do you think dominates?

B: Honestly, my gut says tokenizing. That's always the thing people talk about optimising. Or maybe MinHash, all that hashing.

A: [amused] Tokenizing was eight seconds of wall time. Extraction was four thousand five hundred CPU seconds. About eighty-seven percent of all the per-document CPU time.

B: [surprised] Eighty-seven percent. For turning markup into text.

A: For turning markup into text. Building a full parse tree of every article in pure Python is far more work per byte than anything else in the pipeline. MinHash came second, about three hundred sixty-six seconds, seven percent, because it's hashing a few thousand shingles a hundred twenty-eight ways per document. And then everything else is tiny. Language ID about a hundred twenty-five seconds. The quality rules, eighty-three. The P I I regexes, sixty-four. Normalizing, forty-nine. The global stages in the parent: L S H and clustering about twenty-seven seconds, decontamination about seventeen. And the first pass, decompressing and parsing the X M L, about a hundred seconds on one core.

A: So tokenizing, the step everyone worries about, is a rounding error, because it runs in Rust with the GIL released. And that's the usual shape of real pipelines. The expensive part is understanding the format. The clever-sounding parts are cheap.

B: Okay so say this whole thing took ten hours. Like if it were the full English Wikipedia. Where do I start?

A: You measure per-stage time first. Don't guess, because, as you just saw, the guess is usually wrong. In text pipelines the expensive stage is usually format handling, parsing HTML or wikitext, or a model-based filter. Not tokenizing, not hashing. Then: the per-document stages are embarrassingly parallel, so use worker processes. Threads only if the hot code is native and releases the GIL. Give workers file paths, not data. Order the filters cheapest first, so the expensive ones see fewer documents. Don't redo slow decompression every run; cache an intermediate format, like that JSON-lines file. Attack extraction directly: more processes, a faster extractor, or just start from pre-extracted text. The global stages, dedup and decontam, need a different kind of scaling: you partition them by hash. And check the input. If you're reading compressed data on one core, that's a ceiling no number of workers will lift.

A: On scaling more generally. Everything up to MinHash is per-document, so it scales with cores. Twenty cores on the Spark should give roughly twice the Mac's throughput on those stages. Efficiency cores help less. L S H and decontam are global, and here they ran in one process. At web scale they get distributed too, by splitting the buckets across machines. That's how datatrove, the library FineWeb was built with, does it.

B: And for dedup specifically, at, say, a billion documents? You still can't touch all the pairs.

A: Two layers. MinHash shrinks each document to a fixed signature, a hundred-something numbers, computed independently per document, so that part's embarrassingly parallel. Then L S H skips the pairwise comparison. Bucketing is basically a hash join, so it's linear in the number of documents. And you can split it across machines by band, each machine handles some of the bands, then merge the candidate pairs with a distributed union-find. FineWeb did exactly this over trillions of tokens, with fourteen bands of eight.

A: Then the funnel. With every filter on, the story goes like this. You start with two hundred eighty-five thousand articles and three hundred seventy-three million tokens of raw wikitext. Extraction takes you down to about sixty-eight and a half million tokens, and that's the big cliff, before you've thrown away a single document. Language ID nibbles off a little. Then the length filter takes out about a hundred thousand documents, but only about four million tokens. The quality rules take a few million more. The two kinds of dedup, at that point, barely register. And decontamination takes off about two million. So you end with about a hundred sixty-eight thousand documents, and about fifty-six million tokens. Roughly fifteen percent of where you started.

A: So three things to check in yours. Extraction should remove more than half the tokens. The length filter should remove a lot of documents but few tokens. In the reference run that's thirty-five percent of documents and six and a half percent of tokens. And near-dedup on its own should remove way more than exact dedup, thirteen thousand four hundred sixty-eight versus a hundred eighty-six, but almost nothing once the length filter has run. The worker stage took about nine minutes of wall time with ten processes, five hundred thirty-six seconds. On a quiet machine it should be well under that.

A: And for the raw versus clean runs, you fill in the numbers yourself. The lesson's author hasn't run that pair on the Spark, so there aren't numbers to match. What you should see is the clean model winning on clean eval and losing badly on raw eval, and the raw model's samples full of markup. If the clean model doesn't win on clean eval, check two things. That both saw the same number of tokens. And that the eval articles really are excluded from both training files.

<!-- section: Break It -->

A: Then you break it. Four ways. First, skip near-dedup and watch the model memorise. Retrain the clean model with near-dedup turned off. And, from the funnel, with the length filter on, near-dedup barely matters on this corpus, so turn the length filter off too, so the stubs stay in. Then prompt both models with the opening of a stub. "Achicourt is a commune. It is in"...

B: [amused] And the no-dedup one finishes the template word for word.

A: [laughs] Word for word. And look at the loss curves. The duplicated run's training loss drops faster than its validation loss. That gap is the signature of memorising repeated text.

A: Second, train in dump order. Swap the random-offset reader for one that just walks straight through an unshuffled train file. And the loss curve gets a texture. Sudden drops when the model hits a run of near-identical bot-made stubs, and bumps when it leaves them.

B: Because three thousand communes in a row are really easy to predict after the first fifty.

A: Right. And it's why shuffling matters, and why a local shuffle buffer smaller than one of those clusters isn't enough.

A: Third, contaminate on purpose. Append the eval articles to the train file three times and retrain. Validation loss on the eval file drops well below the clean run. But loss on genuinely new text, say, articles from a newer dump that weren't in your snapshot, doesn't improve at all. You've built a model that looks better and isn't. And now you know what to look for when a number in a paper seems too good.

A: Fourth, forget normalization. Skip N F C and the whitespace cleanup, rerun exact dedup and MinHash, and count. Exact dedup misses more, because one invisible character changes the whole hash. And a few documents with odd whitespace end up with shingle sets that don't match. On Wikipedia the effect's small, because editors and bots are pretty consistent. On web text it isn't.

<!-- section: Go Deeper and Connections -->

A: If you want to go further, the FineWeb paper and its blog post are the best single resource on all of this. Every stage, with an experiment behind each choice. And for the MinHash and L S H math, the "Finding Similar Items" chapter of Mining of Massive Datasets, by Leskovec, Rajaraman and Ullman, is the clearest derivation there is.

A: And this connects straight to your cross-encoder at work. Same skill. Before you touch the model, deduplicate the query-document pairs. Check that your eval queries don't leak into training. And look at fifty random examples. Later on, when you get to why evals are kept separate, that takes the contamination idea further. And when you train a draft model for speculative decoding, the choice of what data you distill on decides how well the small model matches the big one.

B: [working it out] Okay, let me try the whole thing. A model just learns whatever text you give it, so the pipeline is mostly about throwing away bad text. Strip the markup, filter junk, remove duplicates, and then pack it into a file the GPU can read fast.

A: [gently] Mostly. But "throwing away bad text" undersells two of those steps. The model learns the distribution of your data, how often each thing follows each other thing. So dedup isn't about bad text. Those French commune stubs are fine text. Dedup is about weight, so a few templates don't get a thousand times the vote. And decontamination isn't about the model at all. It's about keeping your measurement honest. So it's three jobs. Decide what counts as text, decide what to keep and how much each thing counts, and store it so the GPU never waits. And none of those you guess. You measure every one.
