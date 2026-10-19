<!-- section: The Problem -->

A: [relaxed, thinking out loud] Here's a thing that looks like a bug and isn't. Take GPT four's tokenizer and give it the word strawberry, with a space in front of it, the way it'd show up in the middle of a sentence. You get back one token. One number. Now give it strawberry with no space, like it's the first word on a line. Three tokens.

B: Same word.

A: Same word. And notice what the model actually gets in the first case. Not the letters. It never sees s, t, r, a, w. It gets one number, and that number picks one row out of a table, one vector. That vector is everything the model knows about that word. And then people ask it how many r's are in strawberry, and they're surprised when it guesses.

B: [skeptical] I mean, I always just thought of tokens as words. Roughly. Like, a token's about three quarters of a word, that's the rule of thumb you see for pricing.

A: That rule of thumb is real, for English. But "a token is a word" is the picture that breaks. A token is a chunk of text that some small program decided to treat as one unit. Sometimes that's a word. Sometimes it's half a word, or a space and a word, or a few raw bytes that aren't even a whole letter. And the program that decides is the tokenizer. It runs before the model ever sees anything.

B: And I've basically never looked at it. When I built GPT two, the model started at the IDs.

A: Right, and the first line of that model was an embedding table with fifty thousand and change rows. You took the number from the paper and moved on. Everybody does. But that number is the tokenizer's whole vocabulary, and a lot of what you count in this field is really counted in its pieces. Fireworks bills you per token. Your server's speed is tokens per second. Your cross-encoder can only read so many tokens of a page before it cuts the rest off.

B: Okay. So who decided where the cuts go?

<!-- section: Where to cut -->

A: So try the two obvious answers first. Letters. Tiny vocabulary, and nothing is ever unknown. But your sequences get several times longer. That's several times less text in the context window, several times more steps to generate a reply. And attention compares every position with every other one, so it gets worse faster than the length does. Plus the model spends its effort relearning, over and over, that t, h, e is a word.

B: And words?

A: Words give you short sequences. But how many words are there? I counted the different words in a big pile of my own writing. Thousands of them, and a big chunk showed up exactly once. And when I counted only the first half of the text, the list was still growing fast when it ran out. Real web text has every name, every typo, every number, every form of every word. Tokenize, tokenizes, tokenizing, tokenizer. A word list that covers all that has millions of entries, most of them barely seen in training. And anything that doesn't make the list gets one placeholder, "unknown", and its meaning is just gone.

B: So you want something in between. Keep common words whole, build the rare ones out of pieces.

A: That's the idea. They're called subwords. And the question becomes, how do you pick the pieces? And the answer came from somewhere nobody expected.

<!-- section: A compression trick -->

A: [warm] Nineteen ninety-four. A guy named Philip Gage publishes a little article in a programming magazine. A new algorithm for data compression. And the whole idea fits in a paragraph. Look through a file, find the pair of neighbouring bytes that shows up most often, and swap every one of them for a byte value the file doesn't use. Write down the swap. Then do it again. Keep going until no pair's common enough to be worth it.

B: That's it?

A: That's it. He called it byte pair encoding. And like most compression schemes, it was mostly forgotten. Then twenty years later, machine translation had exactly the problem we just talked about. The models kept a list of the most common words, and everything else came out as unknown. Names, rare words, German compound words. The translator literally couldn't translate them. And a group at Edinburgh, Rico Sennrich and his colleagues, took Gage's loop and ran it on the letters inside words. Frequent words ended up as one piece. Rare words as a few familiar pieces. And nothing was ever unknown again.

B: Huh. So BPE started out as a zip file.

A: It started out as a zip file. And honestly it still is one. Hold onto that, because it explains almost every weird thing tokens do.

<!-- section: Bytes are the floor -->

B: Wait, but if you start from letters, don't you need every letter in every language in your list?

A: You do, and that's the trap with letters. There's something like a hundred and fifty thousand characters in Unicode, every writing system, every emoji. Miss one, and it's unknown. So GPT two did something smart. It went back down to bytes. The way text is actually stored on disk, a format called UTF eight, every character becomes somewhere between one and four bytes. Plain English letters are one byte each. Telugu letters are three bytes each.

B: [working it out] So if your starting pieces are just bytes, there's only... two hundred fifty-six of them.

A: Two hundred fifty-six. And every string that could ever exist, any language, any emoji, even corrupted garbage, is some sequence of bytes. So nothing can ever be unknown. That's byte-level BPE, and it's what GPT two, GPT four, Llama three and most recent models use.

B: And what looks like one letter to me could be several bytes to it.

A: Often. Take the word Telugu, written in Telugu. A reader sees three letters. But Telugu writes vowels as little marks attached to the consonant, and each mark is its own character. So it's six characters, three bytes each, eighteen bytes. Before any merging, that's eighteen tokens. Everything now depends on which merges the tokenizer learned.

<!-- section: Count, glue, repeat -->

A: So here's the loop, and it's really just Gage's. Turn your training text into bytes. Count every pair of neighbours. Take the most common pair, give it a new number, and glue it together everywhere it appears. Write down that rule, that's a merge. Then count again. Now the new piece can be part of a pair too. Keep going until your vocabulary is as big as you wanted.

B: And the tokenizer is just... that list of rules?

A: The two hundred fifty-six bytes plus an ordered list of merges. That's the whole thing. And the fun part is watching what it finds. On the little example from Sennrich's paper, newest, widest, low, lower, the first things it glues are e and s, then that with t. It's discovered the English ending "est", without anybody telling it what a suffix is. Just because it's frequent.

B: [jumping in] Okay, so when new text comes in, you just look for the most common pairs in that text and glue them?

A: That's the natural guess, and it's wrong in a sneaky way. You replay the merges in the order they were learned. Earliest first. Because the later merges were learned on text where the earlier ones had already happened. A merge for "think" might only exist because an earlier merge made "th" first. Replay them in order and you get exactly the pieces the model saw in training. Do it any other way, and you can still turn the tokens back into the right text. Nothing errors. But you've handed the model sequences it's never seen, and it quietly gets worse.

B: So a perfect round trip doesn't mean the tokenizer's right.

A: It just means you didn't lose anything. It says nothing about whether you made the pieces the model expects.

<!-- section: Fences -->

A: There's one more piece, and it's where the strawberry thing comes from. If you just let BPE run on raw text, it'll happily glue across words. When I tried that on my own writing, within a few hundred merges it had tokens like "of the", with the spaces, as one piece. "Is the". "S, period, space."

B: Which is a waste. You'd end up with "dog" with a period and "dog" with a comma as different tokens.

A: Different and unrelated. So before BPE runs, the text gets chopped into word-ish chunks by a pattern, and merges aren't allowed to cross those fences. That's called pre-tokenization. And in GPT's pattern, a word's chunk includes the space in front of it. So "space strawberry" is one chunk, and it's common, so it got merged all the way into one token. Strawberry at the start of a line is a different chunk, a rarer one, and it never got glued all the way.

B: So the space really is part of the word, as far as the model's concerned.

A: Part of the word. Small pattern choices, big consequences.

<!-- section: What it does to models -->

A: [relaxed] And once you see it as a compression scheme, the strange behaviours stop being strange. Spelling's the obvious one. The letters are locked inside an ID. Spell the word out with spaces between the letters and suddenly every letter is its own token, and the counting gets much easier.

B: What about math? Models used to be weirdly bad at adding long numbers.

A: Same root. Numbers get chopped into chunks. GPT two chopped them inconsistently, so a slightly different number got cut in completely different places, and the model can't learn which digit is the hundreds. GPT four cuts them into groups of three from the left. Consistent, at least. But when you add, you carry from the right. So the chunks still don't line up with how you'd actually do the sum. Some models just split every number into single digits. It's honestly still an open question.

B: And code?

A: Code is mostly about spaces. Python indentation is runs of spaces, and GPT two made every space its own token. Later tokenizers learned tokens for runs of spaces, and a big part of why they got better at code was just that.

B: [working it out] Okay, but then the language thing. If it compresses whatever it saw a lot of...

A: That's the one that touches you. I took the first article of the Universal Declaration of Human Rights, in English and in Telugu, and counted. With GPT two's tokenizer, Telugu was one token per byte. Not a single merge applied. It had basically never seen Telugu. With GPT four's tokenizer, it was still about eight times as many tokens as the English. Same meaning.

B: So someone writing in Telugu pays eight times as much.

A: Eight times the bill, an eighth of the context, slower replies. And often worse answers, because the model sees the language as long strings of byte fragments. GPT four o's tokenizer was trained on a lot more non-English text, and it brings that gap way down. And I saw the same thing in miniature when I trained my own tokenizer on English writing. English compressed nicely. Telugu didn't move at all. Every byte stayed its own token, no matter how many merges I added.

B: Because it's a zip file trained on English.

A: Because it's a zip file trained on English. It compresses what it saw.

<!-- section: The glitch token -->

A: And my favourite one. In early twenty twenty-three, two researchers noticed that GPT three era models went completely strange when you asked them to repeat one particular string. SolidGoldMagikarp. They'd refuse, or say a different word, or get kind of rude.

B: [laughs] Why that?

A: There's a Reddit community where people just count, one post at a time, forever. And a few of the most active users posted their usernames thousands and thousands of times. The tokenizer's training text had a lot of Reddit in it, so that username got merged into a single token. But the model itself was trained on differently filtered data, where that token almost never appeared. So its row in the embedding table was barely trained. Close to random noise, just sitting there in the vocabulary.

B: So you feed it in and the model gets a vector it's never really learned anything about.

A: It has no idea what to do with it. The tokenizer and the model were trained on different text. And that's a real lesson, not just a funny one. Those two should see the same data.

<!-- section: Control tokens -->

B: How does a chat work, then? There's a system prompt, my turn, the model's turn. Is that some separate structure?

A: It's all one long sequence of tokens. A few tokens are added by hand, not learned. Special tokens. "A message starts here." "A message ends here." A little template flattens the conversation into text plus those markers, and it ends right where the assistant's reply should start, so the most likely next thing is the reply. Every model family has its own template, and using the wrong one is a classic silent failure. The model still talks. Just worse.

B: [skeptical] And if I type the end-of-message marker into my own message?

A: That's the nasty one. With some tokenizers, by default, the literal text gets turned into the real control token. So anybody who can put text in your prompt can close their turn and start a fake one. Some libraries refuse to do that unless you explicitly allow it, which is the safer default.

<!-- section: Ending -->

B: Okay, let me try. A token isn't a word. It's a piece that a compression loop decided to glue together, starting from raw bytes and merging whatever pairs showed up most in its training text. So common English words end up as single pieces, and anything it didn't see much of stays in fragments. And that's why spelling, long numbers and other languages go wrong. The model's only ever seen the pieces.

A: That's it. The one thing I'd sharpen is the word "fragments". The model doesn't see broken pieces of a word it otherwise understands. Each token is just a number with a learned vector, and if the tokenizer made a piece the model rarely saw, that vector is barely trained, close to noise. So when a model does something odd with a specific word, a name, a number, a language, the first thing to ask isn't what the model thinks. It's what pieces it was actually handed.
