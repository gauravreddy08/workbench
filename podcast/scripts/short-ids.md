<!-- section: The Interview -->

A: [relaxed, thinking out loud] So I watched a friend do an interview. The prompt was, build a URL shortener with Claude Code, then explain it and make it production-ready. And the agent had something working in about ten minutes. Paste in a long link, get back a little six-character code. Done.

B: Honestly that sounds like a fair thing for an agent to nail.

A: It worked. The core of it was tiny. Make six random bytes, write them out in base sixty-four, keep the first six characters. Then look in the database to see if that code's already there. If it is, make one more. Then insert it. And then the interviewer started asking questions, and every question landed on a different crack.

B: [amused] I can see where this is going.

A: First one was, why six characters? How many links before two of them get the same code?

B: [working it out] Well, six characters of base sixty-four, that's sixty-four times itself six times. That's, what, tens of billions?

A: About sixty-nine billion.

B: So, never. Unless you're running the biggest shortener on earth.

A: That's what everyone says. Hold that thought, because it's wrong, and it's the fun part. But the interviewer actually started somewhere smaller. They said, I see a slash and a plus sign in some of these codes. What happens when someone clicks one?

<!-- section: Why not base sixty-four -->

B: [skeptical] I mean, I'd have used base sixty-four too. It's the standard way to turn bytes into text. Everybody's got it in their fingers.

A: It's great for what it was made for. The trouble is which symbols it uses. Letters and digits get you most of the way, and the last two it picked are the plus sign and the slash. Plus an equals sign on the end for padding.

B: And a slash in a URL means a new folder.

A: Right. If your code has a slash in the middle, the browser asks for two path pieces, and your server never sees one code at all. And a plus sign, in a query string or a form, gets turned into a space when it's decoded. So your code arrives with a hole in it. And it's not rare. A real chunk of those random codes have one or the other.

B: Okay, so you escape them.

A: You can, but then the code gets longer, and every layer between the user and you has to get the escaping right. There's actually a URL-safe version of base sixty-four, called base sixty-four URL, that swaps those two symbols for a dash and an underscore. Those are genuinely safe, and it's a perfectly good choice for long tokens. Login tokens like JSON Web Tokens use it.

B: So why not that?

A: For short codes a person actually sees, most people drop the two weird ones entirely. Just the ten digits and the letters, both cases. That's sixty-two symbols, so it's called base sixty-two. And the reasons are small and human. Double-click a code with a dash in it and it only selects half. And two fewer symbols costs you almost nothing.

B: And base sixty-two is just counting, right? Like base ten with more digits.

A: Pretty much, yeah. In base ten, each column is worth ten times the one to its right, and when you run out of symbols you carry. In base sixty-two each column's worth sixty-two times the one to its right. So a code is literally a number, written in a bigger alphabet. Which matters for the next question.

<!-- section: Three ways to pick a code -->

A: So TinyURL launched in two thousand two. Long links pasted into emails kept getting wrapped across lines and breaking. And a short link is just a row in a table. A code, pointing at a long URL. The whole service is a lookup and a redirect. The only genuinely interesting decision is how you pick the code.

B: And there's more than one way.

A: There are three, and each one gives up something different. The first is, just count. Link one, link two, link three, and you write the number in base sixty-two. That's the auto-incrementing key your database gives you for free. It never clashes, because no number is ever handed out twice. The codes are as short as possible. And new keys always land at the right-hand edge of the index, which is the cheapest possible insert.

B: That sounds perfect.

A: It does, until you notice the codes tell a story. Anyone can just walk them. Try this code, add one, try the next, and see every link anyone made, including ones that were meant for one person. And it leaks how busy you are. Make one link on Monday, another on Friday, subtract, and you know exactly how many links all your competitor's customers made that week.

B: [laughs] That's kind of brutal.

A: It's old, too. In the Second World War, Allied statisticians did exactly this with the serial numbers on captured German tanks, and estimated how many tanks were being built more accurately than the spies did.

B: So counting's out, at least if people can see the codes.

A: At least if they see them directly. The second way is, pick the code at random, from a properly secure random source. Then no code tells you anything about any other. The cost is that two random picks can land on the same code. Which brings us back to your "never".

B: Still, random sounds like the clean one.

A: It's the cleanest. But the third way is the one that sounds smartest. Hash the long URL and keep the first few characters. Same URL always gives the same code, so if a million people shorten the same news article, you store it once. But a hash cut down to a few characters is just scrambled stuff, so different URLs clash exactly as often as random codes do. You still need a plan for clashes. And usually you don't even want the dedupe. Two customers shortening the same page each want their own link.

B: So it's really count or random.

A: Mostly. And random is the one with the trap.

<!-- section: Sixty-nine billion, and three hundred thousand -->

B: Okay, so go on, why is "never" wrong? Sixty-nine billion codes. If I've handed out a few million, I've used a sliver of that. The odds that a new one lands on an old one have to be basically nothing.

A: So that last sentence is actually true. Keep it, it comes back. But it's answering a different question from the one that bites you. For the agent's codes, the first clash anywhere in the table is expected after about three hundred thousand links.

B: [skeptical] Three hundred thousand. Out of sixty-nine billion.

A: A tiny sliver of the space. And the reason is a puzzle you've probably heard. How many people do you need in a room before there's an even chance two of them share a birthday?

B: I know this one's a trick. It's way less than half of three sixty-five.

A: Twenty-three. It feels wrong because you're picturing someone matching your birthday, and that does take a big room. But the question is whether any two people match. And when a new person walks in, they don't get one new chance to match. They get one chance with every person already there. So pairs grow much faster than people. Double the room and you've roughly quadrupled the pairs.

B: [working it out] So with codes, every new code gets compared against every code that's already out there. And the pairs blow up like the square of how many codes I have.

A: Right. Which means clashes don't show up halfway through the space. They show up around the square root of it. That's called the birthday bound. And in bits it's really clean. As far as the first clash goes, a random code behaves like one with half as many bits. Which is a far, far smaller space.

B: Huh. Half the bits. That's a nasty little rule.

A: And the part I didn't expect was how much it wobbles. I drew random four-character codes, about fifteen million possible, until one repeated, and did that a thousand times. On average the first repeat came after a few thousand draws, right where the math says. But one run hit a repeat after about a hundred. A hundred, out of fifteen million.

B: That's just bad luck.

A: It's bad luck, but over a thousand runs, something that unlucky happens. And your service is one run. You don't get to average.

<!-- section: Any clash versus my clash -->

B: Okay, so now I'm worried. If clashes are basically guaranteed, random codes sound like a terrible idea.

A: And this is where your first instinct comes back and rescues you. There are two different questions here. The birthday one is, has any pair of codes ever clashed? That's the right question if nobody checks. But you're going to check. When the database says that code's taken, you just draw another one. So the question that matters for you is, when I draw one new code, what's the chance it's already taken?

B: And that's just... how full the space is.

A: That's all it is. Say you've got a hundred million links in a seven-character space. The chance a new code is taken is about one in thirty-five thousand. A retry is a rounding error. Each one is one extra trip to the database.

B: So both are true. A clash somewhere is certain, and I'll almost never actually have to retry.

A: Both true at the same time, and you want to be able to say both in an interview. The first is why you need the database to refuse duplicates. The second is why the retry loop is cheap. The thing to watch is how full the space is. It's fine, it's fine, it's fine, and then once the space is a real fraction full, it falls off a cliff. Nearly full, you're drawing over and over to find one free code.

B: And I guess that same number cuts the other way. If one in thirty-five thousand codes is taken, then someone guessing codes at random hits a real link one time in thirty-five thousand.

A: Same number, upside down. So "not guessable" isn't only about how random the codes are, it's about how empty the space is. Researchers have scanned real short-link services and found shared cloud documents and map directions that people assumed were private. If the links point at private things, you want longer codes, or a limit on how fast anyone can try them, or both.

<!-- section: Who decides taken -->

B: Okay, so the plan's simple. Draw a code, check if it exists, and if it doesn't, insert it. Which is what the agent did.

A: That's the third crack. The interviewer's question was, two servers, same moment, same random code. What happens?

B: [working it out] Well, they'd both check... and both see it's free. Oh. And they both insert.

A: Both insert. There's a gap between the check and the write, and the other server slips into it. If the table has no rule about uniqueness, you now have two links with one code, and someone gets sent to the wrong page. If it does have the rule, the second server's insert blows up with an error it never planned for, and that user gets an error page. And trying once more doesn't help with either.

B: That's the same bug as two requests both checking a limit, both seeing room, and both going ahead.

A: It's that bug, wearing a different hat. And I wanted to see it. So I made the space tiny, two-character codes, so clashes would come up in seconds, and had eight processes hammer one table with check, then insert. No uniqueness rule. I ran it three times, a few hundred inserts per process, and every single run quietly stored duplicates. Nothing crashed. You'd never know.

B: So what's the fix, a lock around the whole thing?

A: The fix is to stop asking. Let the database be the referee. You declare the code column unique. Under the hood that's an index, the same sorted tree you'd use to look codes up, with one extra rule. When an insert walks down to the spot where the key belongs and finds it already there, it fails instead of adding a second copy. And the database does that find-and-write as one step. It holds a lock on that one page while it checks and writes, so nothing can sneak in between.

B: So two inserts of the same code race, and...

A: Exactly one wins. The other gets a uniqueness error, and you catch it and treat it as "draw again". That's called insert and catch the conflict. And it beats checking first three ways. It's correct, because your check was a guess about the future and the index is the truth at the moment of writing. It's one trip to the database instead of two. And the index it needs is one you needed anyway, because every redirect looks a link up by its code.

B: [amused] So the agent was doing extra work to be less correct.

A: [laughs] Kind of, yeah.

<!-- section: Many servers -->

B: Okay, so random codes are covered by the unique index. What about the counter? With one database it's easy, the database hands out the next number.

A: With one database, yes. The trouble starts when you grow. Split your table across lots of database servers, or run in a few regions, and there's no single place that knows the next number. Make one, and every insert anywhere waits on a trip to it, maybe across an ocean. And when it's down, nobody can create anything. That's a single point of failure: one piece breaks and the whole thing stops.

B: And you can't really make one counter fast enough for the whole planet.

A: Not really, so you route around it. The oldest trick is, don't hand out one number at a time. Hand out blocks. A server asks the counter once, gets a thousand numbers, and hands those out from memory. The counter sees one request per thousand links. If a server crashes, the rest of its block just never gets used, and that's fine. IDs need to be unique, not consecutive. Flickr ran a famous version of this with two tiny database servers whose only job was handing out numbers. One gave out odd numbers, one gave out even ones, so either could die and the other kept going.

B: That's charming.

A: [warm] Then there's Twitter. They gave every tweet a number from one counter in one database. And in June two thousand nine, those numbers got too big for the kind of integer a lot of third-party apps were storing them in, and those apps broke. People called it the Twitpocalypse. Then they moved tweets to a database with no built-in counter at all, and needed lots of machines making tens of thousands of IDs a second, each on its own, with no clashes.

B: Without talking to each other.

A: Without talking to each other. Their answer, in twenty ten, was Snowflake. Every machine gets a number once, when it's deployed. Then it builds each ID out of three things. The current time in milliseconds, its own machine number, and a little counter for IDs made in the same millisecond. Two machines can't clash, because their machine numbers differ. One machine can't clash with itself, because either the time or the counter always moves forward.

B: And because the time is at the front, the IDs sort by when they were made.

A: Right, which is why a tweet ID tells you roughly when it was posted. Discord, Instagram, lots of others copied the idea. It breaks in two ways. Give two machines the same number, say a recycled container, and they can mint the same IDs. Or the clock jumps backwards and it could reissue IDs it already gave out. Twitter's version just refuses to make IDs until the clock catches up.

B: And then the other option is just, a giant random number? A UUID?

A: Yeah, that's random codes taken to the limit. The usual random kind, version four, has so many random bits that if you made a billion a second, you'd expect your first clash after about ninety years. So nobody checks. Every machine just makes them, and the primary key is a backstop that in practice never fires.

B: [skeptical] There's always a catch.

A: The catch is the index again. Random keys land at random spots in that sorted tree, so every insert touches a different page, and once the tree's too big for memory you're pulling a fresh page in for nearly every insert. The newer version, version seven, puts the time first and fills the rest with randomness. So new keys pile up at the right-hand edge, like a counter, but machines still don't have to coordinate. On my Mac, inserting a couple million of each, version seven was about thirteen times faster.

B: But a UUID's way too long for a short link.

A: Way too long, and even a Snowflake's a bit long. So lots of systems use both. A UUID or a Snowflake as the row's real key inside, and a separate short code for humans.

<!-- section: Ending -->

B: Okay, let me try to say it back. Random codes clash way sooner than you'd think, because it's about pairs, so trouble starts around the square root of the space. But clashes are still rare for any one insert, so you put a unique index on the code as a safety net, and if an insert fails you just draw again. Don't check first, because two servers can both pass the check.

A: That's nearly all of it. The one word I'd change is "safety net". A safety net sounds like something that almost never matters. A clash somewhere is certain, so the index isn't a backup for your code. It's the only place uniqueness actually comes from. Your code just asks, and the database says yes or no. And the number to keep an eye on is how full the space is, because that's both how often you retry and how often a stranger guessing codes gets lucky.
