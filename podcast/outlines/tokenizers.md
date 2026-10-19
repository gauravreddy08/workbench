# Outline: tokenizers

Source: src/lessons/tokenizers.mdx. Curriculum: "Tokenizers."

## The one big idea

A tokenizer is a compression scheme learned from some pile of text: start from raw bytes and keep
gluing together whatever pair shows up most often. It compresses what it saw a lot of and leaves
everything else in fragments, and nearly every token surprise (cost, context, spelling, numbers,
Telugu costing several times English, glitch tokens) falls out of that.

## Opening scene

"strawberry" with a space in front is one token to GPT-4's tokenizer; without the space it's three.
The model never sees the letters, only an ID, and then people ask it to count the r's.

## Wrong mental model B voices

"A token is basically a word, roughly." Later: "so the model knows how strawberry is spelled";
"if the round trip works, the encoder is right".

## Story beats

1. The strawberry ID: one number, no letters inside. The embedding row is all the model knows.
2. Where should the cuts go? Letters make sequences long (less context, slower, attention grows
   with the square); words never stop growing and the leftovers become "unknown".
3. Origin: Philip Gage's compression trick in a programming magazine, forgotten; translation's
   unknown-word problem; Sennrich and colleagues at Edinburgh rescue it; GPT-2 moves it to bytes.
4. Bytes as the floor: UTF-8, one to four bytes per character; Telugu's three letters are many more
   bytes. Starting from the two hundred fifty-six byte values means nothing is ever unknown.
5. The loop: count neighbouring pairs, glue the winner, repeat. It discovers "est" without knowing
   what a suffix is. Encoding replays merges in the order learned, so the model sees the pieces it
   trained on.
6. Fences: without pre-splitting, merges glue "of the " into one token. The regex fence is why the
   space sits at the front of a word, which is the strawberry surprise.
7. What follows: spelling, number chunks that don't line up with carrying, whitespace in code,
   Telugu (when I trained my own on English prose, Telugu didn't compress at all), glitch tokens
   (SolidGoldMagikarp: tokenizer and model trained on different data).
8. Special tokens and chat templates, briefly: the conversation is one long sequence with
   control tokens, and text that contains one can be smuggled in.

## Numbers said aloud

One token versus three; two hundred fifty-six byte values; Telugu about eight times English with
GPT-4's tokenizer.

## Left to the written lesson

UTF-8 bit patterns, the regex itself, the toy corpus counts, vocab-size table and parameter shares,
compression measurements, Telugu token counts per tokenizer, WordPiece/SentencePiece/Unigram,
Qwen's chat template detail, all Build It tasks and code, tiktoken matching, the streaming decode
bug, wrong-order merges, Explain It Back.
