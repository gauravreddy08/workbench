<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, an interview. The interviewer asks, "What's an API lifecycle?" And you say something about requests coming in and responses going out. And they nod, politely, and move on. And you know you missed it.

B: [a bit sheepish] I mean, that's honestly what I'd say. A request comes in, it goes through the server, a response comes back. That's the life of it.

A: That's one real answer, actually, and we'll get to it. But it's not the one they wanted. So let me show you the same gap from the other side, on your own machine. Your model server on the Spark takes a field called max tokens. And you read that OpenAI renamed that field, when the reasoning models arrived. So you rename it in your server too. Thirty seconds of work. Every test still passes. The server starts. Curl works.

B: Sounds fine.

A: A week later you notice the scoreboard. Every request is now finishing in about a second, and the speed numbers have shifted. You didn't change the model. What happened is, your benchmark script still sends the old name. And your server, like most Python servers, quietly ignores fields it doesn't recognise. So it used the new field's default, which was sixteen tokens. Every request since the rename has been a sixteen-token request.

B: Oh no. And short answers have a totally different speed profile from long ones.

A: So every row since then is measuring something else. Nothing crashed. Nothing logged an error. The only client you have broke, and neither of you noticed.

B: [quietly] Huh. That's kind of horrifying.

A: And that's what the interviewer was asking about. An API is a promise. To people whose code you can't see and can't redeploy. The lifecycle is making that promise, keeping it, changing it, and eventually ending it, without hurting anyone. And inside that, there's the smaller lifecycle you described. The trip one request takes through your server. Which is where every one of those promises actually gets checked.

<!-- section: Things you can't redeploy -->

A: [warm] And this problem is older than it sounds. By the late nineties the web had millions of servers and hundreds of millions of browsers, and nobody could upgrade them all at once. A server written one year had to keep working with a browser from three years later, and the other way round. Roy Fielding, who'd helped write the HTTP spec, described the architecture that made that work in his PhD dissertation in two thousand, and called it REST.

B: I always thought REST was just "use JSON over HTTP and name your URLs nicely."

A: That's what it turned into in practice. But the actual point was that clients and servers evolve independently, so the interface between them has to stay stable. And then about ten years later, companies started selling APIs as products. Stripe's whole business was an API, and its customers' code was charging real credit cards. Stripe couldn't break that code. But it also couldn't stop improving.

B: So what did they do?

A: They pinned everybody. Each account gets the version from the date it started. Code written years ago keeps getting the old behaviour until someone upgrades on purpose. And inside, Stripe writes everything for the newest version, and each breaking change comes with a little translator that turns a new-style answer back into the old shape for anyone pinned behind it. That idea got copied everywhere.

<!-- section: Write the promise down first -->

A: So the long lifecycle starts with design. And the big idea there is, write the promise down before you write the code. There's a standard format for it called OpenAPI. One file that describes every address your server answers at, every field it accepts, every field it returns, every error.

B: FastAPI generates that for me, though.

A: It does, from your Python, after the fact. And that's the thing. If the code comes first, the code decides what you promised. Teams who care write the file first, for the same reason you write a test before you fix a bug. It forces the decision. And from that one file you get docs, client libraries, validators, and the test we'll get to later.

B: What kind of decisions?

A: Lots of small ones that are cheap on day one and expensive on day four hundred. But the one I'd pick out is errors. Every error from every endpoint should have the same shape, so a client writes one error handler and it covers everything. And your server speaks OpenAI's dialect, so its errors should look like OpenAI's.

B: [skeptical] Does that really matter? An error's an error.

A: Here's where it bit me. FastAPI's default for a bad request is a different shape and a different status code from everything else. And the OpenAI SDK turns status codes into specific exception types. So when I sent an empty message list through the SDK against the default server, it raised a kind of error that client code written for OpenAI doesn't catch. Change the handler so it returns the standard bad-request shape, and the SDK raises exactly the error people's code already expects.

<!-- section: The retry problem -->

A: Now, here's a design problem that surprises everyone the first time. A network call can fail three ways. The request never got there. It got there and failed. Or it got there, worked, and the answer got lost on the way back.

B: And the client can't tell the first from the last.

A: Can't tell. So every good client retries. The OpenAI SDK retries a couple of times by default. And for reading something, that's fine. Doing it twice is the same as doing it once. That property has a name, idempotent. But creating a completion isn't. Every POST runs the model again.

B: [working it out] So if my model's slower than the client's timeout...

A: That's exactly what I set up. A fake model that takes a couple of seconds, a client with a timeout shorter than that, and a couple of retries. The model ran three times. And the client got nothing. Just a timeout error at the end. Because the server never knew the client had left, it kept finishing each one.

B: Three generations, zero answers.

A: And on your real server, with one request on the GPU at a time, it's worse. Those retries queue up behind the first one, and everyone else's wait grows by two ghost requests.

B: So how do you fix it? You can't stop the client retrying.

A: You let the client say "this is the same request." That's an idempotency key. Stripe made it popular. The client makes up a random ID once, for one logical operation, and sends it in a header on every retry. The server keeps a little table. The first request with that key claims it and does the work. A retry that shows up while it's still running gets told "still working, try again." A retry that shows up after gets the saved answer, replayed. When I ran the same test with a key, the model ran once, and the client got a real answer.

B: Okay, that's really clean.

A: And there are two traps. One, two retries can arrive at the exact same moment, so "check if the key exists, then insert it" has a gap in the middle. You make the claim one single step in the database. And two, the key has to belong to a caller. If you make keys global, and two people both send the key "one", which people really do, Bob gets Alice's answer. On a real service, that's Bob reading Alice's data.

<!-- section: What counts as breaking -->

A: Okay. So say your API is out, people depend on it. Every change you make is one of two kinds. Additive, like a new endpoint, or a new optional field. Those are safe. Or breaking. Removing a field, renaming it, making something required, changing what something means.

B: [skeptical] And breaking is pretty obvious, right? If something breaks, the client errors, and you find out.

A: That's the picture, and the rename shows why it's wrong. The breaks that hurt most don't error. Change a default, and every client that relied on it just quietly gets something different. Add a new value to a list of possible answers, and some client with a switch statement and no default branch falls over. Start rejecting unknown fields, and a client that always sent some extra field you always ignored suddenly gets an error.

B: So whether something's breaking depends on what the clients actually do.

A: Not on what you meant to promise. There's a name for that. Hyrum's Law. Hyrum Wright at Google. It says once enough people use your API, every behaviour they can observe will be depended on by somebody, whether you wrote it down or not. Field order. Error message wording. How long a request takes.

B: So how do you defend against that?

A: Partly by telling clients to read only the fields they need and ignore the rest. And partly with a different kind of test. Not "is my server correct" but "does my server still keep its promise to this client." The really good version is written from the client's side. Your benchmark script writes down exactly what it sends and exactly which fields it reads, and the server has to keep all of that passing. That's called a consumer-driven contract test. And it would have caught the rename instantly, because it encodes what the benchmark actually does. Ask for seven tokens, check you got no more than seven.

<!-- section: Versions, and ending them -->

A: So when you really do need to break something, you make a new version and run it next to the old one. You can put the version in the address, like a slash v two, which shows up in every log line and every curl. Or in a header, the way Stripe and Anthropic do it with dates.

B: And then I copy the server into a v two folder.

A: [laughs] That's the worst way to do it. Then you're fixing every bug twice for three years. The good shape is one core that does the real work, and each version is a thin adapter on top. It translates its own request shape into the core's, and the core's answer back into its own. A bug fix in the core fixes it for everybody. A breaking change only touches one adapter.

B: And then at some point you turn off the old one. Send an email, pick a date.

A: That's what people think. But telling people isn't enough. So there are headers for it. Every response from the old version carries a note: this is deprecated, it stops working on this date, here's the migration guide. The response is still completely correct, it's just a hint. And a client that logs a warning when it sees one is a client that migrates in time.

B: But not everyone's reading their logs.

A: Not everyone. And that's the uncomfortable part. Migration has a long tail. Most clients move fairly quickly, and the last few take forever, and some never move until something breaks. A cron job written by someone who left. A notebook on a forgotten machine. The only reliable way to find those is to break them briefly, on purpose, while there's still time. A short, announced outage before the real shutdown. That's called a brownout. And after the shutdown, the old address should answer "gone," not "not found." "This existed and was removed on purpose" is a lot more useful than "never heard of it."

B: And that's why you need to log which key is on which version.

A: You can't email the people still on the old version if you don't know who they are. "Who's still on version one?" should be a query, not a guess.

<!-- section: The life of one request -->

A: So now zoom way in. From months to milliseconds. Your answer from the interview. A request arrives, and on its way to your handler it passes through a line of checks. Something decrypts it, usually a proxy, not your Python. Then routing works out which function it's for. Then the stuff that wraps every request. A request ID and a log line. Who are you. Are you over your limit. Then, does the body match what we promised. Then the idempotency check. And only then your handler.

B: Is there a logic to the order, or is it just convention?

A: There's a logic. The cheap checks that reject the most go first. Anything that needs to know who you are goes after you've proven who you are, so rate limiting comes after auth, because it needs to know whose budget to spend. Anything that costs money, the GPU, goes last. And logging wraps the whole thing, because the requests you most need to see in your logs are the ones that got rejected.

B: [skeptical] All that must add up, though.

A: When I measured the whole API layer on my laptop, auth and rate limiting and the idempotency check together, it was about a millisecond or two. Next to the seconds a real request spends on the GPU, that's nothing. So you never skip any of it "for speed" on an inference server. The thing that costs is the GPU. And the API layer's whole job is to stop wasted GPU work. Duplicate retries, broken requests, callers over their budget.

B: And for my server specifically, the promise isn't really mine, is it. I'm copying OpenAI's.

A: That's the funny part. Nobody voted for OpenAI-compatible to be the standard. OpenAI shipped the first LLM API most developers used, their SDK let you change the base address, and every competitor realised the fastest way to win a customer was "change one line to try us." So now everything speaks it. Which means you don't own your contract. OpenAI changes it on its own schedule, like that rename. So you pick a subset, write it down, and say which subset you support.

<!-- section: Ending -->

B: Okay, let me try. An API is a promise to code I can't see. The lifecycle is designing it, ideally written down first, keeping it, changing it with new versions and warnings, and finally turning the old one off. And the per-request lifecycle is just the pipeline where those promises get checked, in an order that throws away the cheap stuff before the GPU ever sees it.

A: That's it. The piece I'd sharpen is "keeping it." You were picturing keeping the promise you wrote down. But the scary lesson from the rename is that you're also on the hook for promises you never wrote down, because clients rely on whatever they can observe. So the real check before any change isn't "does my spec still pass." It's "does my actual client still get what it was getting." And the cheapest way to know is a test written from that client's side.
