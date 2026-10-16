<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, your GPT two build. The very first line of the model is the embedding table, and the size you gave it was fifty thousand two hundred fifty-seven rows, by seven hundred sixty-eight. And I'd bet you didn't think twice about that first number. You took it from the paper and moved on, because the model starts at token IDs, and the thing that makes token IDs was somebody else's library.

B: Yeah, honestly. I copied it. I think I assumed it was, like, the fifty thousand most common words, plus some change.

A: [amused] That's the picture most people have. And it's wrong in a way that explains a lot of weird stuff. Here's the first weird thing. Take OpenAI's tokenizer library, it's called tick-token, and ask it for GPT four's tokenizer, the one called C L one hundred K. Encode the word strawberry with a space in front of it. You get one token. One number, seventy-three thousand seven hundred. Now encode strawberry with no space in front. Three tokens.

B: [surprised] Wait, the space changes it from one to three?

A: The space changes it from one to three. Same word. And notice what that means. The model never sees s, t, r, a, w, b, e, r, r, y. It sees seventy-three thousand seven hundred. A number with no letters inside it.

B: [skeptical] Huh. But the model knows how to spell. Like, I can ask it to spell strawberry and it does.

A: It can, sometimes. But only because somewhere in training it saw that word spelled out, and it memorized what's inside that number. The letters aren't in the input. So then people ask it how many r's are in strawberry, and they're shocked when it guesses.

B: Okay. That's a fun party trick, but—

A: [jumping in] Here's the part that's not a party trick. I mean, it's the part that touches you directly. Take Article One of the Universal Declaration of Human Rights. In English, Hindi and Telugu. Count tokens. English is thirty-three tokens, and it's thirty-three for GPT two, for GPT four and for GPT four o, all the same. Telugu is four hundred twenty-nine tokens for GPT two. Two hundred seventy-nine for GPT four. Seventy-eight for GPT four o. Same sentence. Same meaning.

B: [surprised] Four twenty-nine versus thirty-three.

A: Yeah. And APIs charge per token. So if you were writing in Telugu on GPT four, you paid about eight times what an English speaker paid for the same request. And you got about an eighth of the context window to work with. Cost, context length, spelling, arithmetic, how fair a model is across languages, even a couple of famous bugs where a model goes haywire on one specific word. All of it comes out of this one small, kind of unglamorous preprocessing step. So let's open it up.

<!-- section: Origin -->

A: [relaxed] And the funny thing is, the algorithm inside almost every tokenizer today wasn't invented for language at all. February nineteen ninety-four. A guy named Philip Gage publishes an article in The C Users Journal. It's called "A New Algorithm for Data Compression". And the whole idea fits in a paragraph. Look through a file and find the most common pair of bytes that sit next to each other. Pick a byte value that the file never uses. Replace every occurrence of that pair with it. Write down the substitution, so you can undo it later. And repeat, until no pair is common enough to be worth it. He called it byte pair encoding.

B: [unsure] So it's just... compression. Shrinking a file.

A: Just compression. Simple, fast to decompress. And then, like most compression schemes, it was pretty much forgotten. Then about twenty years later, machine translation with neural networks has a vocabulary problem. Those models took the thirty to fifty thousand most common words, gave each one a number, and everything else got mapped to one single symbol meaning unknown. So names, rare words, compounds, and German loves compounds, all of those came out as unknown. The translator literally could not translate them. It didn't know what they were.

B: [amused] So any name that wasn't famous enough just disappears.

A: Disappears. And in twenty fifteen, Rico Sennrich, Barry Haddow and Alexandra Birch at Edinburgh posted a paper, "Neural Machine Translation of Rare Words with Subword Units". It came out at a conference called A C L in twenty sixteen. They took Gage's loop and ran it on characters inside words, instead of bytes in a file. Frequent words ended up as one symbol. Rare words ended up as a few familiar pieces. And nothing was ever unknown. Then in twenty nineteen, GPT two took that same loop and moved it back down to raw bytes. Which is, more or less, where nearly every large model's tokenizer lives today.

<!-- section: The Idea: A token is an ID for a chunk of text -->

A: So let's build it up from nothing. A neural network only eats numbers. So to feed it text you need two things. A way to cut the text into pieces, and a fixed list that gives every possible piece a number. The piece is called a token. And a token is really two things at once: a chunk of text the model treats as a single unit, and the integer ID that stands for it. The chunk could be a letter, a whole word, part of a word, a space, or even just a few raw bytes. The fixed list is the vocabulary. Every token in it gets an ID from zero up to the size of the vocabulary minus one. And that size is decided before training, and it's baked into the model's first layer and its last layer. And the program that does the cutting and the numbering, in both directions, text to IDs and IDs back to text, that's the tokenizer. It's trained separately. Before the model even exists.

B: So when I said fifty thousand common words, the thing I got wrong is just that the pieces aren't words.

A: That's most of it. Some pieces are words. Plenty aren't. And then each ID does exactly one thing. It picks a row out of that embedding table you built. A learned list of seven hundred sixty-eight numbers. And that row is the only thing the model ever knows about the token. If the token is space-strawberry, the model knows one vector. It doesn't know the vector was spelled with three r's, unless it learned that fact from seeing the word spelled out somewhere in training. So the real question of this whole thing is, where should the cuts go?

<!-- section: The Idea: Why not letters? Why not words? -->

A: Try the two obvious answers first. Letters. Every letter is a token. The vocabulary is tiny. A few hundred symbols covers most of the world's alphabets, if you're careful. And nothing's ever unknown. But your sequences get long. English averages a bit under four characters per GPT four token on normal prose. So a character-level model sees every text as roughly four times as many positions.

B: Four times longer. Okay, so four times slower?

A: Generation, yeah, roughly. Every letter you generate costs a full forward pass through the model, so a reply takes about four times as many passes. Your context window holds four times less text. But attention is worse than four. Attention compares every position with every other position. So its cost grows with the square of the length.

B: [working it out] So four times longer is... four times four. Sixteen times the attention work.

A: About sixteen. And on top of that, the model spends its capacity relearning, over and over, that t, h, e is a word. So, words, then. Every word is a token. Sequences are short, and each token carries a whole meaning. Lovely. Except, how many words are there? I mean, just try counting. I counted the distinct words in a pile of my own technical writing. That's about one point three megabytes of text, so roughly a long novel's worth. Nine thousand five hundred thirty-eight different words. And three thousand two hundred fifty-two of those showed up exactly once.

B: A third of them, once.

A: [matter-of-fact] About a third, once. And if you count only the first half of the text, you get six thousand seven hundred seventy-six. So the list was still growing fast when the text ran out. It wasn't settling down at all. And that's a pretty tidy corpus. Real web text has every name, every typo, every number, every URL, every hashtag, and every form of every word. Tokenize, tokenizes, tokenizing, tokenizer, tokenizers. Five entries. A word vocabulary that actually covers the web has millions of entries, and every one of them needs its own row in the embedding table, trained from however few times that word happened to appear. And anything that doesn't make the list becomes the unknown token. People write it as U N K in square brackets. It's one placeholder, one vector, for every word you didn't know. So the meaning's just gone.

B: Same problem the translators had.

A: Same problem exactly. So picture one sentence, "Tokenizers are unbelievably useful", with a period, cut three ways, stacked on top of each other. Top row, characters: thirty-five little boxes, one per letter, space and period. Never fails, but long. Middle row, words: five boxes. And the very first box, where "Tokenizers" should be, just says unknown, because that word wasn't in the list. Its meaning is gone. Bottom row is what GPT four's tokenizer actually does: seven boxes. "Token", then "izers". Then space-are, space-unbelie, then "vably", space-useful, and the period.

B: [amused] Unbelie, vably. That's a strange place to cut.

A: It is, and we'll see exactly why it cuts there. But look at what you get. The common words, are and useful, stay whole. The rare word gets built from parts the tokenizer has seen many times. Sequences stay short for normal text, the vocabulary stays a manageable size, and any word at all can be built from pieces. That middle ground is called subwords. And then the only question left is how you choose the pieces. And B P E's answer is, let the data decide. Merge whatever shows up together most often. But before you merge anything, you have to decide what the smallest piece is. And letters sound like the natural answer. They're a trap.

<!-- section: The Idea: Bytes, and why letters is the wrong floor -->

A: Text in a computer is stored as numbers. The international standard for that is Unicode. It gives every character in every writing system a number, called a code point. Lowercase a is hex sixty-one. The Telugu letter a is hex C zero five. The grinning face emoji is hex one F six zero zero. About a hundred and fifty thousand characters have been assigned so far, emoji included.

B: And a hundred and fifty thousand doesn't fit in a byte.

A: Not even close. A byte holds two hundred fifty-six values. Code points go up to about one point one million. So you need a way to turn code points into bytes, and the standard way is called U T F eight. It's almost all the text on the web and on disk. And it's variable length. Plain English letters are one byte each, which, by the way, means old-school plain English text is already valid U T F eight. Most accented Latin letters, plus Greek, Cyrillic, Arabic and Hebrew, are two bytes. Most other scripts, Hindi, Telugu, Chinese, Japanese, are three bytes. And emoji and rarer characters are four.

A: So try this. The word Telugu, written in Telugu script. To a reader it looks like three letters. How many bytes is it in U T F eight?

B: [working it out] Three letters, three bytes each... nine?

A: [amused] Eighteen.

B: Eighteen? Where do the other nine come from?

A: The three letters you see are actually six code points. Telugu writes vowels as little marks attached to the consonant. So it's the consonant ta with a vowel sign on it, then la with a vowel sign, then ga with a vowel sign. And each of those marks is its own code point. Six code points, three bytes each, eighteen bytes. Hindi works the same way. And that's the first reason Indian languages are expensive. Before any tokenizer even touches them, they're already about three times as many bytes per character as English.

B: Okay, so how does a program even read that? If characters are one to four bytes, how does it know where one character stops?

A: [warming up] That's the clever part. The first byte of every character starts with a little pattern of bits that says how long the character is. A zero up front means "I'm a one-byte character". One, one, zero means two bytes. One, one, one, zero means three. Four ones and a zero means four. And every byte after the first, every continuation byte, starts with one, zero. So picture a little chart. Lowercase a is a single box. The accented e is two boxes. Telugu a is three. The emoji is four. And in every row the first box says the length and every box after it starts the same way. Which means you can always tell where a character begins, even if you land right in the middle of one. You just skip the bytes that start with one, zero.

B: Nice. So it's self-synchronizing, sort of.

A: That's the word people use for it, yeah. Now here's the key move. If your smallest unit is a character, your base vocabulary needs every Unicode character. That's around a hundred and fifty thousand entries before you've merged anything. And any character you didn't include is unknown again. But if the smallest unit is a byte, the base vocabulary is exactly two hundred fifty-six entries. The values zero to two fifty-five. And every possible string, in any language, any emoji, even corrupted binary junk, is some sequence of bytes.

B: [skeptical] Hang on. Two hundred fifty-six entries covers Telugu? And Chinese?

A: Covers everything. Telugu is just bytes. They might be ugly bytes, three per code point, but they're bytes, and every byte has an ID. So nothing can ever be unknown. That's called byte-level B P E. It was introduced with GPT two in twenty nineteen, and it's what GPT two, GPT four, Llama three, Qwen and most other recent models use. The cost is, before any merges happen, a byte-level tokenizer sees the word Telugu as eighteen tokens. One per byte. Everything now depends on which merges it learned.

<!-- section: The Idea: BPE training -->

A: [relaxed, matter-of-fact] So here's the whole algorithm, and it really is short. Turn your training text into a list of byte values. Those are your starting tokens, IDs zero to two fifty-five. Count every pair of tokens that sit next to each other. So in the word hello, the pairs are h-e, e-l, l-l, and l-o. Take the most frequent pair in the whole text. Give it a brand new ID, two hundred fifty-six. Replace every occurrence of that pair with two fifty-six. And write down the rule: this token followed by that token becomes two fifty-six. That rule is called a merge. Then go back and count again. And now the new token can itself be part of a pair. Keep going until you've added as many tokens as you want.

B: So the vocabulary size is just two fifty-six plus however many merges you ran.

A: Exactly that. It's a knob you choose. And now you can finally explain your fifty thousand two hundred fifty-seven. GPT two did fifty thousand merges. Two fifty-six plus fifty thousand is fifty thousand two hundred fifty-six. Plus one special token, which we'll get to. Fifty thousand two hundred fifty-seven.

B: [laughs] Okay. That's very satisfying.

A: And the output of training is just that ordered list of merges. That's it. That's the tokenizer. Two hundred fifty-six bytes, and a list of rules in the order they were learned.

A: Let's do it by hand on the toy example from Sennrich's paper. It uses letters instead of bytes, just so you can read it, and it handles each word separately, which we'll come back to. The corpus is "low" five times, "lower" twice, "newest" six times, and "widest" three times. And picture a little trainer for this, where you see each word split into single letters, and next to it a table of every adjacent pair with its count, weighted by how many times the word appears. You click a button, it merges the top pair everywhere and records the rule underneath. There's a running count of how many symbols are in the corpus. And you can edit the corpus and try your own words.

A: So, before you click. Which pair gets merged first?

B: [working it out] Uh... low shows up a lot. Five times plus lower twice, so l-o is seven. But newest is six times. N-e, e-w, w-e, e-s, s-t... and widest has e-s and s-t too. So e-s is six plus three, nine. And s-t is also nine.

A: Nice, you found the tie. E-s and s-t are both nine. The tie goes to the pair seen first, so e-s wins. And then what's next?

B: Well now every e-s is followed by t. So es plus t... nine again?

A: Nine again. Es plus t becomes est. And only then l-o, at seven. And look at what just happened. In two steps, the tokenizer discovered the English suffix "est". Nobody told it what a suffix is. It found it because it's frequent. And there are two things to notice. The symbol count in the corpus drops with every merge. The first one alone takes out nine symbols. That's compression. That's literally what Gage built it for. And the merges are learned in order, and that order matters when you use them.

<!-- section: The Idea: Encoding and decoding -->

A: Because training happens once, on a big corpus. But encoding happens every time someone sends text. To encode a new string, you turn it into bytes. You look at every adjacent pair. Among the pairs that have a merge rule, you find the one whose rule was learned earliest, the lowest merge number. You apply that merge everywhere in the string. And you repeat until no adjacent pair has a rule.

B: Why earliest? I'd have guessed you'd merge whatever's most frequent in the string you're encoding. That's what training did.

A: [thoughtful] That's the natural guess, and it's wrong in a really quiet way. Later merges were learned on text where the earlier merges had already been applied. Say merge number five hundred joins space-t-h with "ink", to make space-think. That space-t-h token only exists because merge number twelve created it. So if you replay the merges in training order, you reproduce exactly the pieces the model saw during training. Pick some other order, and here's the sneaky bit, you'll still decode back to the right text. But you'll produce token sequences the model has never seen. And it'll just behave worse. Nothing errors.

B: So it's not wrong-wrong. It's just off-distribution.

A: Right. And you'll make that mistake on purpose later. Decoding is the easy direction. Look up each ID's bytes, glue them all together, and then decode the bytes as U T F eight. Keep that order in mind. Glue first, decode after. It comes back to bite.

A: Now picture watching this happen on real text. I trained one thousand twenty-four merges, byte-level, on that same pile of my own writing, about one point three megabytes. You type anything, and there's a slider from zero merges up to one thousand twenty-four. At zero every byte is its own box. Bytes that aren't a whole character on their own show up as little hex codes. And as you drag right, boxes fuse, and the box made by the latest merge is filled in. There are presets: English, code, Telugu, numbers, and a strawberry one.

A: So, the English preset is sixty-five bytes. At the full thousand twenty-four merges, how many tokens?

B: Hmm. If it's like GPT four, four bytes a token, then... sixteen? But this is a way smaller vocabulary. Twenty-five?

A: Twenty-three. About two point eight bytes per token. Words I use a lot, like space-token, space-bytes and space-then, become single tokens. Space-merges is still four pieces, because a thousand merges isn't enough to reach it. And the first merges you see as you drag are things like space-t, space-a, h-e, e-r, i-n, then space-the. The most common pairs in English. Now the Telugu preset. Seventy-six bytes.

B: [hesitant] Fewer... I don't know. Fifty?

A: [quietly] Seventy-six. It doesn't move at all. Drag all the way to the end and it's still seventy-six bytes, seventy-six tokens. The training text had basically no Telugu in it, so there isn't a single merge for Telugu byte pairs. Every byte stays its own token. And that's the multilingual problem in miniature. A tokenizer is a compression scheme tuned to its training data. It compresses whatever it saw a lot of.

<!-- section: The Idea: Pre-tokenization -->

A: Now, there's a piece I skipped. If you run B P E on raw text with no boundaries at all, it will happily learn merges that cross words. I tried it on about a hundred fifty kilobytes of my own writing. Within three hundred merges it had learned tokens like "e space the space". "Of the", with the spaces. "Is the". An s, a period and a space. Even a period, a newline, a dash, and the two stars that start a bold bullet point.

B: [amused] It learned your markdown habits.

A: [laughs] It learned my habits, yeah. And that wastes vocabulary on accidental phrases. And worse, dog-period, dog-exclamation-mark, dog-question-mark and dog-space all end up as different, unrelated tokens. The model has to learn each one separately. So before B P E runs, the text gets chopped into chunks by a regular expression, a little text-matching pattern, and merges only happen inside a chunk. They're never allowed to cross a chunk boundary. That's called pre-tokenization.

A: And GPT two's pattern is basically a list of alternatives, tried left to right. First, the common English contractions, like apostrophe-s, apostrophe-t, apostrophe-re. Then, an optional space followed by a run of letters. And "letters" here means any letter in any script, not just A to Z. Then, an optional space and a run of digits. Then, an optional space and a run of punctuation. And then whitespace. And there's one little rule in the whitespace part that matters a lot. When it sees a run of spaces, it grabs all of them except the last one. The last space gets left behind to stick to the front of the next word.

B: Oh. So that's why the space goes on the front of the word. Space-strawberry.

A: That's exactly why. Space-strawberry is one chunk. And strawberry at the start of a line, with nothing in front, is a different chunk with different bytes. Which is the one token versus three tokens surprise from the very start.

A: And GPT four's pattern made a few deliberate changes. The contractions are case-insensitive now. Runs of digits get cut into groups of at most three. And newlines get their own handling, so code indentation compresses. I ran both patterns on one line. Something like: hello world, it's twenty twenty-six, two exclamation marks, some spaces, x equals one two three four five six seven, then a newline and an indented return. GPT two keeps space-twenty-twenty-six as one chunk, and the whole seven-digit number as one chunk. GPT four's pattern splits off the space by itself, then cuts the year into two-oh-two, and then six.

B: [skeptical] Wait. The year gets split into two oh two and six? That seems worse.

A: It looks worse for a year. But for the long number it gives you one-two-three, four-five-six, seven. Groups of three, always, counting from the left. And the newline gets its own chunk, separate from the run of spaces after it. Small regex choices, big consequences. Hold on to that digit grouping, because it explains a lot about arithmetic.

<!-- section: The Idea: Special tokens and chat templates -->

A: Some tokens never come from text at all. A special token is an ID you add to the vocabulary by hand. B P E didn't learn it. It's a control signal: end of document, start of a message, padding. And ordinary text should never be able to produce it. GPT two has exactly one. It's called end of text, ID fifty thousand two hundred fifty-six, and during training it's placed between documents, so the model learns where one document stops and the next starts. That's the plus one in fifty thousand two hundred fifty-seven.

B: Okay, so the whole number's accounted for now.

A: All of it. Chat models need more than one, though. A conversation has a system prompt, user turns, assistant turns. And the model has to know who said what, and when it's its turn to talk. But the model doesn't receive a list of messages. It receives one long sequence of tokens. So the recipe that flattens a list of messages into that one sequence is called a chat template. On Hugging Face it's a small template program stored right alongside the tokenizer, and it produces the exact text-plus-special-tokens layout the model was fine-tuned on.

A: Take Qwen two point five's template. The format's called Chat M L. The system message is "You are helpful," and the user says "Hi" with an exclamation mark. And you'd see three rows. First row starts with a special token, im start, which is one single ID, one hundred fifty-one thousand six hundred forty-four. Then the ordinary word "system", a newline, the system text as normal tokens, then im end, one hundred fifty-one thousand six hundred forty-five, and a newline. Second row: im start, "user", newline, "Hi", the exclamation mark, im end, newline. And the third row is just im start, "assistant", newline. And then it stops.

B: It stops in the middle of the assistant's turn?

A: On purpose. It's a cliffhanger. The prompt ends right where the assistant's reply should begin, so the most likely continuation is the reply. The model writes it, then it emits im end, and the server sees that ID and stops generating. And notice the roles, system, user, assistant, are just ordinary word tokens. It's only the boundaries that are special.

B: And every model uses this same format?

A: No, and that's where it gets dangerous. Llama three uses a different one, with tokens like start header I D, end header I D, and end of turn. Every model family has its own. And using the wrong one is a classic silent failure. The model still produces text. Just noticeably worse text, because it's seeing a format it was never fine-tuned on.

B: [working it out] So, no crash, no error. Just... a dumber model, and you'd never know why.

A: You'd never know why. Two more details that matter. If you leave out the system message, Qwen two point five's template silently inserts one for you: "You are Qwen, created by Alibaba Cloud. You are a helpful assistant." And because special tokens get matched before B P E even runs, any user text that contains the literal characters of im end might get turned into the real control token. You'll try that one on purpose later.

<!-- section: The Idea: WordPiece, SentencePiece, Unigram -->

A: You'll run into two other names, so briefly. WordPiece is Google's method, from Schuster and Nakajima in twenty twelve, and it's what BERT uses. It's like B P E, but instead of merging the most frequent pair, it picks the merge that most increases how likely the training data looks under the model. And it encodes greedily: take the longest vocabulary entry that matches the start of the word, then continue from there. Pieces that continue a word get marked with two hash signs in front. And BERT's version works on characters, not bytes. So it has an unknown token. I ran Telugu through the standard BERT model, bert base uncased, and almost every word came back as unknown. Seventeen tokens for the whole sentence.

B: Which sounds cheap.

A: Sounds cheap, until you realize the meaning was thrown away. Seventeen copies of "no idea". Then there's SentencePiece. That's a library from Google, Kudo and Richardson, twenty eighteen, not an algorithm. It's used by T five, Llama one and two, and Gemma. It treats the space as just another symbol, written as a little low bar, so it works on languages that don't put spaces between words at all, like Japanese and Chinese. It can train B P E, or something called Unigram. And it can fall back to bytes for characters it hasn't seen, which is called byte fallback, and Llama two used it.

B: And Unigram is...?

A: Unigram, from Kudo, also twenty eighteen, works backwards from B P E. Instead of starting small and merging up, it starts with a huge list of candidate pieces and keeps deleting the ones whose removal hurts the likelihood of the training text the least. And when it encodes, it picks the most probable split. But honestly, the family differences matter less than the idea they share: frequent things get short codes. And byte-level B P E mostly won because it's simple, it's fast, and it can't fail on any input.

<!-- section: The Idea: How big should the vocabulary be? -->

B: [thinking] Okay, so if it can't fail, and more merges means shorter sequences, why not just go huge? A million tokens.

A: [patient] Because vocabulary size is a trade between two costs, and you only named one. More tokens in the vocabulary means shorter sequences. More merges, more whole words and common phrases, fewer tokens per sentence. And shorter sequences mean more text fits in the context window, fewer forward passes to generate a reply, less attention work, and a smaller K V cache. Quick reminder on that: the K V cache is the memory where the model keeps the attention keys and values of every past token, so it doesn't recompute them. It grows with every token in the context. So fewer tokens, smaller cache.

B: That all sounds like reasons to go huge.

A: That's the first cost. Here's the other side. More tokens in the vocabulary means bigger matrices. The embedding table has one row per token, and each row is as wide as the model. Then the output layer, the one that scores every possible next token, is another matrix the same size, unless the model ties the two together and reuses one. And that scoring, computing a probability for every single vocabulary entry, happens at every position. And then, each extra token you add is rarer than the ones before it. So its row gets fewer training updates.

A: Put real numbers on it. GPT two small. Fifty thousand two hundred fifty-seven tokens times seven hundred sixty-eight wide is about thirty-nine million parameters. Out of a hundred twenty-four million total. So the vocabulary is about a third of the whole model.

B: A third? Of GPT two? Just the lookup table?

A: About thirty-one percent, yeah. In and out are tied there, so you only pay once. Qwen two point five, the half-billion one. About a hundred fifty-two thousand tokens times eight hundred ninety-six wide. A hundred thirty-six million parameters, out of about four hundred ninety-four million. More than a quarter. Also tied. Then Llama three eight B. A hundred twenty-eight thousand tokens times four thousand ninety-six wide is about five hundred twenty-five million, and Llama three doesn't tie them, so you pay twice, about one point oh five billion. Out of about eight billion. So roughly an eighth. All of those come from the models' published config files, so you can check them yourself.

B: [working it out] So the bigger the model gets, the smaller a slice the vocabulary is.

A: That's the pattern. For a small model, the vocabulary's a big chunk of everything it has. For a big model it's a modest tax, and the sequence-length savings pay for it many times over. Meta reported that Llama three's tokenizer, a hundred twenty-eight thousand tokens, which is a hundred thousand taken from tick-token plus twenty-eight thousand added for other languages, encodes English in about fifteen percent fewer tokens than Llama two's thirty-two thousand. That's why vocabularies grew. GPT two, fifty thousand. Llama two, thirty-two thousand. GPT four, a hundred thousand. Llama three, a hundred twenty-eight thousand. Qwen two point five, a hundred fifty-two thousand. GPT four o, two hundred thousand. Gemma, two hundred fifty-six thousand. As models got wider, the matrix cost per token shrank relative to the model. And serving lots of languages and long contexts made every saved token worth more.

B: So for a small model, thirty-two K. For a big one, go big.

A: Thirty-two to sixty-four thousand makes sense for a small model, yeah. A two hundred fifty-six thousand vocabulary on a tiny model could be most of its parameters. But the real answer is to measure. Take your actual data mix, train tokenizers at a few vocab sizes, measure tokens per byte at each, and weigh that against the parameter cost.

<!-- section: The Idea: What tokenization does to models -->

A: So now the payoff. A whole list of strange model behaviors that stop being strange once you think in tokens. First, cost and context. API prices, rate limits, context windows, they're all counted in tokens. Not words, not characters. For English on a GPT four-class tokenizer, the rule of thumb is about four characters per token, or roughly three quarters of a word. So a thousand tokens is about seven hundred fifty words. For code it's fewer characters per token, and for most non-Latin scripts it's a lot fewer.

A: Second, spelling. Space-strawberry is one ID in GPT four's tokenizer, seventy-three thousand seven hundred. To count its r's, the model has to have memorized what's inside that ID, from the rare places in training where somebody spelled the word out. Now ask it to spell the word with spaces first, s space t space r and so on, and every letter becomes its own token. The task gets way easier. And modern models often get it right anyway, because they've been trained on this exact meme, and on spelling things out step by step. But the underlying weakness is still there, and you'll reproduce it on a small model.

A: Third, arithmetic on long numbers. GPT two split the number one through zero, one two three four five six seven eight nine zero, into one-two-three, four-five, six-seven-eight, and nine-zero. And a slightly different number gets cut in completely different places. So the model can't learn any consistent sense of "this column is the hundreds".

B: But GPT four fixed that, with the groups of three.

A: Partly. GPT four's groups are consistent, but they're counted from the left. So that same number is one-two-three, four-five-six, seven-eight-nine, zero. And when you add two numbers, where does the carrying start?

B: [working it out] From the right. Ones column first. Oh. So the groups line up from the left, but the carry goes from the right. If the two numbers have different lengths, the groups don't even line up with each other.

A: [pleased] That's the problem. The chunks don't match place value. Llama one and two went the other way and split every number into single digits. And how to tokenize numbers is honestly still an open design question.

A: Fourth, code and whitespace. Python indentation is runs of spaces. GPT two tokenizes four spaces as four separate tokens. So a return statement indented by eight spaces is eight tokens of space before you even get to the word. GPT four's tokenizer has tokens for runs of spaces. The same line is two tokens. On a small Python function, I measured thirty-five tokens with GPT two against twenty-three with GPT four. A big part of why later tokenizers got better at code is just that they learned to compress whitespace.

A: Fifth, and this is the one I really want you to sit with, the language gap. Back to the opening numbers. Article One, in bytes, is a hundred seventy in English, five hundred in Hindi, and four hundred twenty-nine in Telugu. With GPT two, English is thirty-three tokens, Hindi is two hundred ninety-six, nine times English, and Telugu is four hundred twenty-nine. Thirteen times English. Four hundred twenty-nine bytes, four hundred twenty-nine tokens.

B: Wait, so that's... one token per byte. No merges at all.

A: [serious] Not a single merge applied. Same as the slider. With GPT four's tokenizer, Hindi's down to about five and a half times English and Telugu's at eight and a half. Qwen two point five, with its hundred fifty-two thousand tokens, gets Telugu to about seven times. And GPT four o's two hundred thousand vocabulary, built with way more non-English text, gets Hindi to under two times English, and Telugu to about two point four.

B: [thoughtful] So I'd always have been paying eight times more to ask GPT four something in Telugu. And I'd have just assumed Telugu is a longer language.

A: And it partly is, in bytes, like we said, three per code point. But mostly it's that the tokenizer barely saw it. And it isn't just the bill. More tokens means less room in the context, slower replies, and often worse answers too, because the model sees Telugu as long strings of byte fragments. A paper by Petrov and colleagues in twenty twenty-three measured this across lots of languages and found gaps of ten times or more for some language pairs on popular tokenizers.

<!-- section: The Idea: Glitch tokens -->

A: And the last one is the weirdest. In early twenty twenty-three, Jessica Rumbelow and Matthew Watkins found that GPT three-era models went strange when you asked them to repeat certain strings. The famous one is space-SolidGoldMagikarp. All one word. Ask the model to repeat it and it would refuse, or say some other word instead, or, in some cases, insult you.

B: [laughs] Insult you? Over a Pokemon name?

A: Over a Reddit username, it turns out. The tokenizer's training text had a lot of Reddit in it, including a community called r slash counting, where people count up together, one post at a time. And the most active users posted their names thousands of times. So space-SolidGoldMagikarp got common enough to become a single token. It's ID forty-three thousand four hundred fifty-three in GPT two's tokenizer, you can check. But the model itself was trained on data that was filtered differently, and that token almost never showed up.

B: So why does that make it go crazy, though? A rare word is just a rare word.

A: Because of the embedding row. Remember, every token is a row in that table, and the row only gets better when the token shows up in training. This one basically never showed up. So its row stayed pretty much at its random starting point. Near-random noise, sitting in the vocabulary like a real word. You feed it in, and the model gets a vector it has no idea what to do with. So the lesson there is, the tokenizer and the model should be trained on the same kind of data, and it's worth checking for vocabulary entries that the model's training data barely contains. GPT four's tokenizer doesn't have that token. But it has its own leftovers. Space-davidjl, another r slash counting username, is a single token in C L one hundred K.

<!-- section: Build It -->

A: Okay, so here's what you'd actually build. One file, B P E dot py, that grows as you go, plus a few small scripts around it. And the thing to keep open next to you, to compare against, not to copy, is Andrej Karpathy's min B P E repo on GitHub. It's the same structure. A basic tokenizer, then one with the regex, then one that matches GPT four.

A: Setup's one sentence. A fresh virtual environment with tick-token, Hugging Face's tokenizers and transformers, and a package called regex. That last one is a drop-in replacement for Python's built-in r e module, and it's there because it understands "any letter in any script" and "any digit", which the built-in one doesn't. Then a corpus, one to five megabytes of text you actually care about. A public-domain novel from Project Gutenberg for English, a few hundred kilobytes of your own Python for code, and some Telugu or Hindi Wikipedia articles pasted into a file. And hold back a separate test file for each category, a few kilobytes each, that's not in the training text. Because compression measured on the text you trained on flatters you.

A: The first real task is five minutes in a Python shell, just looking at bytes. Take the string "Hi", space, the Telugu letter a, space, the grinning emoji. Ask its length and you get six characters. Encode it and count bytes, and you get eleven. H, i and the two spaces are one byte each, the Telugu letter is three, the emoji is four. Print the bits of the Telugu letter and check them against that one-one-one-zero, one-zero, one-zero pattern. And then the one that matters. Take just the first two of the Telugu letter's three bytes and try to decode them as text.

B: It breaks.

A: [laughs] It throws an error. And if you tell it to replace errors instead, you get that little diamond with a question mark in it, the replacement character. And that's the most important thing in the whole shell session. A slice of a character's bytes isn't text. And a byte-level tokenizer's tokens can end in the middle of a character. So a single token often can't be decoded on its own.

A: Then the trainer. Three functions. One counts every adjacent pair. One merges a given pair into a new ID. And train, which loops: count, take the max, merge, record the rule, and add the new token's bytes to the vocabulary, which is just the two pieces' bytes glued together. And there's one trap in merge. Say your list is one, one, one, and you merge the pair one-one.

B: [working it out] You get... new, new? No, wait. The middle one can't be used twice. New, one.

A: New, one. Walk with an index, and when you merge, skip ahead by two. Ties in the max go to whichever pair was counted first. Test it on the toy corpus first, and your first merges should match the ones we just worked out by hand, give or take spaces. And turn on a verbose mode that prints every merge as the two pieces and what they make. Reading the first fifty merges of your own corpus is honestly half the fun. Then train two hundred fifty-six merges on a hundred kilobytes and time it. And then stop, before training anything big, because this version still merges across word boundaries.

A: Next, encode and decode. Encode loops while there are at least two tokens. Count the pairs, pick the one with the lowest merge number, and if none of them has a rule, you're done. Otherwise merge it and go again. Decode glues the bytes and decodes once, with errors replaced, because a model can absolutely generate a sequence of IDs that isn't valid U T F eight and you don't want to crash on that. Then you try to break the round trip. Encode, decode, check you get the original back. For a thousand random Unicode strings, with characters from all four byte lengths. One catch there, you have to skip a range of code points called surrogates. They're not real characters, and U T F eight can't encode them. Plus a few nasty ones by hand. The empty string, a single emoji, Telugu, a null byte, a zero-width space, and ten thousand spaces in a row.

A: Then you add the GPT two regex and special tokens. Text gets split into chunks first, and B P E runs inside each chunk separately. And there's one trick that makes training fast enough. The same chunk, say space-the, shows up thousands of times. So count the distinct chunks first, keep one byte list per distinct chunk along with its count, and when you count pairs inside a chunk, add its count instead of one.

B: So you're merging inside each unique word once, instead of every time it appears.

A: Right. Merging only ever touches the distinct chunks. With that, a plain Python version trained a thousand twenty-four merges on one point three megabytes in about sixty seconds on a Mac. Without the dedup it'd be far slower. Special tokens: encode takes a set of allowed special strings. It splits the text on those first, emits the special ID for each one, and runs normal B P E on the pieces in between. And by default, allow none, the way tick-token does. Then retrain on your whole corpus. Four thousand ninety-six tokens is a good first target, figure a few minutes in plain Python. And save the merges, in order, to a file, so you're not retraining every time.

A: And then the real test. The only real test of an encoder is to load somebody else's merges and get their exact output. Tick-token gives you GPT two's table as a private attribute, mergeable ranks. Private, so check it still exists in your version. It maps each token's bytes to its rank, which is its ID. But it doesn't give you the merges themselves. So you recover them. For every token longer than one byte, run B P E on its bytes using only the merges ranked below it. It'll end up as exactly two pieces. Those two pieces are the merge that made it.

B: That's kind of neat. You're replaying history to find out what each token was made from.

A: Pretty much. Two gotchas. In GPT two's table, the single bytes don't have IDs equal to their values. The byte for a space is thirty-two, but its ID is two hundred twenty. So you need a little map of all two fifty-six bytes to their IDs, applied before merging, and the reverse map when decoding. And GPT two's regex in tick-token is very slightly different from the one I described. That doesn't matter for normal text, but if you see a mismatch, print the chunk. Then run your encoder and tick-token side by side over two hundred kilobytes of mixed text, Telugu and emoji included, and check the lists are identical. When I did this, my plain Python encoder matched all forty-nine thousand seven hundred thirty tokens exactly. Then have an agent review your encoder for edge cases. And read min B P E's GPT four version after you're done. Not before.

A: Last few, quickly. A compare script that measures bytes per token for your tokenizer, GPT two, GPT four's and GPT four o's tokenizers, Qwen and BERT on each held-out file, and also counts how many unknown tokens BERT spits out on the Telugu file. You write it, an agent can explain anything that surprises you. Then inspect a real chat template. Apply Qwen's to a system message and a "Hi", print the text and every ID with what it decodes to, and print the template's source, including the branch for tools. Then drop the system message and watch the default one appear. Then turn off the generation prompt and spot what's missing at the end. And if you've got access to Llama three's tokenizer, it's gated behind a license click on Hugging Face, compare its format.

A: And the last task is making a real model fail. Load Qwen two point five, the half-billion instruct model. It's small, so the Spark or even your Mac is fine. Give it words like strawberry, bookkeeper, mississippi, referral, nonnegotiable, zzyzx, parallelogram, embarrassment, plus ten of your own, some invented. For each one, pick the most repeated letter and ask how many times it appears. Once with the word normal, once with the letters spaced out. And record how many tokens the word is, with a space in front. Now, I haven't run the model side of it myself, so I can't give you a score. But expect the small model to do badly on the plain version and noticeably better on the spaced one. Then addition. Twenty random pairs of three-digit numbers, then twenty pairs of nine-digit numbers, and look at how each number is tokenized. Qwen splits numbers into single digits. Compare that with GPT four's groups of three.

B: [skeptical] And if I try it on a frontier model and it gets every single one right?

A: That's expected too. And worth thinking about why. It's been trained on this exact meme, and it's learned to spell words out step by step before counting. The weakness is still in the input. It's just learned to work around it. And you're done when the round trip holds for all of those strings, your encoder matches tick-token's GPT two output exactly, you've trained your own tokenizer of at least four thousand ninety-six tokens and can read and explain its first thirty merges, the comparison is filled in, Telugu or Hindi included, and you have a plain-versus-spaced letter-counting result in actual numbers.

<!-- section: Measure -->

A: So, measuring. The number you care about is bytes per token. Bytes of text divided by number of tokens. Higher is better compression. And you fill it in for each tokenizer, on English, code, Hindi and Telugu. Your thousand-merge one, your four thousand ninety-six one, GPT two, GPT four's, GPT four o's, and Qwen's.

A: For reference, here's what I measured. My thousand-twenty-four-merge tokenizer, trained on my own English writing, got two point seven bytes per token on that same prose. That's in-sample, so it's flattering. On a Python file it got one point five. And on Hindi and Telugu, exactly one point oh. One byte per token. No merges for them at all. On the same English prose, GPT two got three point seven, and GPT four's and GPT four o's tokenizers both got four point oh. On the Python file, GPT two got two point one and the two newer ones got about three point two to three point three. And on Article One, English was five point two bytes per token for all three OpenAI tokenizers. Telugu was one point oh with GPT two, one point five with GPT four's, and five point five with GPT four o's.

B: Wait, so GPT four o compresses that Telugu better than English?

A: On that one text, in bytes per token, yeah, slightly. Because Telugu starts out with so many bytes per character, and GPT four o learned big merges for it. In tokens it's still about two point four times English, like we said. And for your own table, here's what to expect. Your tokenizer will lose on English, by a lot. Four thousand tokens can't hold many whole words, and your corpus is tiny next to theirs. But your tokenizer might actually beat GPT two, and even GPT four's tokenizer, on Telugu. If your corpus had real Telugu in it.

B: [surprised] My four thousand tokens beating GPT four's hundred thousand?

A: [emphatic] On Telugu, it can. A tokenizer compresses what it was trained on. A small vocab with the right data can beat a big vocab with the wrong data. And that's the whole story of multilingual tokenizers, measured on your own laptop. For code, it depends on whitespace. Compare GPT two against GPT four's tokenizer on the same file and most of the gap is indentation.

A: Then time your training at five hundred twelve, a thousand twenty-four, two thousand forty-eight and four thousand ninety-six merges, and record bytes per token on the English test file at each. You should see training time grow roughly in a straight line with the number of merges, because each merge is one more full pass over the distinct chunks. But compression improves less with every doubling. The first merges capture space-the and i-n-g. The last ones capture words that show up a dozen times. That's diminishing returns. And it's the same curve that tells model builders when a bigger vocabulary stops paying for its embedding rows.

A: And the last measurement is the personal one. Take one paragraph you'd actually send to a model, in English, and translate it into Telugu yourself, not with a machine. Count tokens with GPT four's tokenizer and GPT four o's. Pick a price, work out what the Telugu version would cost per million paragraphs, and write the ratio down. You should land somewhere around the opening numbers. Several times English for GPT four's tokenizer. Much closer for GPT four o's.

<!-- section: Break It -->

A: And then you break it, on purpose, four ways. First one. What if you decode one token at a time? That's what a streaming server does. It sends each new token to the user as it's generated. So the naive version takes each token's bytes and decodes them as U T F eight and prints them, one by one.

B: And Telugu tokens end in the middle of a character. So it errors.

A: It throws a decode error on Telugu or on an emoji. And if you switch to replacing errors, you get those diamond question marks scattered through the text. Which is a bug you've probably seen in real chat apps. The fix is to keep a little buffer of bytes and only print what forms complete characters. Python has an incremental U T F eight decoder that does exactly that. And every real serving engine carries this logic in its detokenizer. That's the "glue first, decode after" rule, coming back to bite.

A: Second. What if you train without pre-tokenization? Use your first trainer, the one with no regex, on the same hundred fifty kilobytes, and print the merges. Within a few hundred you'll see of-the, is-the, s-period-space. Then pick a common noun in your corpus, like dog, and count how many distinct tokens contain it, with the regex and without. Without it, punctuation and neighboring words get glued on, and one word smears across a bunch of unrelated tokens the model would have to learn separately.

A: Third. What if you apply the merges in the wrong order? Change encode so it picks the pair that's most frequent in the input instead of the one with the lowest merge number. Then run the round-trip test.

B: It'll pass, right? You said that earlier. Decode still gets the text back. So, honestly, I'd ship that. If the round trip passes, the encoder's fine.

A: [firm] That's the trap. The round trip passes. Now compare against tick-token, from the matching task. Mismatches everywhere. A round trip proves you didn't lose any information. It says nothing about whether you produced the tokens the model was trained on. And a model fed off-distribution token sequences, for the exact same text, gets measurably worse. And nothing errors.

A: Fourth. What if you smuggle in a special token? Take the Qwen tokenizer and encode "hello", then the literal characters of im end, then "world". When I ran this, ID one hundred fifty-one thousand six hundred forty-five, the real end-of-message token, showed up right in the middle. Hugging Face tokenizers match special-token strings in raw text by default.

B: [concerned] So if a user types im end into my app, they can close their own turn. And then write a fake assistant turn, or a fake system message.

A: Anyone who can put text into your prompt can do that. Now turn on the option called split special tokens, and the same string becomes ordinary harmless pieces. Then try tick-token. Ask it to encode the end of text string, and it raises an error unless you explicitly allow that special token. That's the safer default. And then go check what your own encoder from the special-tokens task does.

<!-- section: Connections and close -->

A: And all of this connects straight back to the model you built. The embedding table's height is the vocabulary size, and the output layer scores every one of those options at every single step. Counting those parameters is the whole game in model memory math. The K V cache and FlashAttention are about costs that grow with every token in the sequence, which is why saving tokens matters. Prefix caching only works if the chat template renders the same system prompt identically every time, and one stray space breaks it. And training your own small language model end to end starts with choosing a tokenizer for your own model. Which you can now do with numbers, instead of copying fifty thousand two hundred fifty-seven out of a paper. And if you want one thing to go further with, Karpathy's two-hour video, "Let's build the GPT Tokenizer", with his min B P E repo, covers all of this by building it.

B: [working it out] Okay, let me try the whole thing. A token isn't a word. It's whatever chunk B P E decided to make, and the model only sees its ID, one row of the table. B P E starts from the two hundred fifty-six bytes, so nothing's ever unknown, and keeps merging the most common pair in the training text. And when it encodes something new, it does the same thing. Merges whatever's most common.

A: [gently] Almost all of that. Except that last part. When it encodes, it doesn't look at what's common in your text at all. It replays the merges in the exact order it learned them, earliest first, so it cuts your text the same way the training text was cut. That's what makes the tokens the ones the model knows. And that's also why Telugu costs eight times more on GPT four's tokenizer. The merges are a record of what the training text was full of. If your language wasn't in there, there's nothing to replay, and you pay for every byte.
