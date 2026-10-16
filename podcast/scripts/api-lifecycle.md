<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, an interview. The interviewer leans back and goes, "What's an API lifecycle?" And you say... something about requests and responses. A request comes in, the server does stuff, a response goes out. And they nod, really politely, and move on to the next question. And you know. You know you missed it.

B: [a bit sheepish] I mean, that's what I'd say. Request comes in, gets handled, response goes back. That's the life of it. What else is there?

A: [warmly] There's a whole other thing, and it's actually the one they meant. But let me come at it from your own machine first, because you've basically already lived through it. So you've got the server on the Spark. The one that speaks OpenAI's format, so any OpenAI client can talk to it. And you've got bench dot pi, your benchmark harness, which fires requests at it and fills in a scoreboard. Speed, decode numbers, all that. And the server takes a field called max tokens. How many tokens to generate, at most.

B: Sure.

A: So then you read that OpenAI renamed that field. In twenty twenty-four, when the reasoning models showed up, it became max completion tokens. And you think, okay, I want to be compatible, so you rename it in your server too. Thirty seconds of work. Every test still passes. The server starts. You curl it, it answers. Done.

B: Seems fine so far.

A: [slowing down] A week later you're looking at the scoreboard, and something's... off. Every request now finishes in about a second. And the decode numbers have shifted. And you didn't touch the model. So what happened?

B: [working it out] Hm. If bench dot pi is still sending the old name... the server should've rejected it, right? It'd throw some error about a field it doesn't know. And I'd have seen that.

A: That's the natural assumption, and it's exactly the one that bit you. It didn't throw. Your server, like most Python servers, quietly ignores fields it doesn't recognise. So bench dot pi sends max tokens, two hundred fifty-six, and the server just... drops it on the floor. Never heard of it. And then it looks for max completion tokens, doesn't find one, and uses the default. Which was sixteen. So every single request in the benchmark has been a sixteen-token request. And short answers have a completely different speed profile from long ones, so every row on that scoreboard since the rename has been measuring something else.

B: [quietly] Oh no. And nothing told me.

A: Nothing told you. Nothing crashed. Nothing logged an error. The only client you have broke, and neither of you noticed. And that's what the interviewer was asking about. An API is a promise. A promise to people whose code you can't see, and can't redeploy. And the lifecycle is the discipline of making that promise, keeping it, changing it, and finally ending it, without hurting anyone. And then inside that, there's a smaller lifecycle, which is the one you described. The path each request takes through your server. That's where every one of those promises actually gets checked.

B: So my answer wasn't wrong. It was just the small one.

A: It was the small one. And in an interview, you say both.

<!-- section: Origin -->

A: And the reason this is a whole discipline goes back to the late nineties. The web had millions of servers by then, and hundreds of millions of browsers. And nobody could upgrade all of them at once. You can't. So a server written in ninety-six had to keep working with a browser from ninety-nine, and the other way round. And a guy named Roy Fielding, who'd helped write the spec for H T T P one point one, sat down and described the architecture that made that work. That was his PhD dissertation, in two thousand. And he gave it a name. REST.

B: [a bit unsure] Okay, REST I know. That's... JSON over H T T P, basically. Nice URLs.

A: [laughs] That's what it turned into in everyday talk. But that wasn't, I mean, that wasn't his point at all. His point was that clients and servers evolve independently. Different people, different schedules, different decades even. So the interface between them has to be uniform, stable, and self-describing, because neither side gets to force the other one to upgrade. That's the lifecycle problem, right there, in nineteen nineties form.

B: Huh. So REST was about change, not about JSON.

A: About surviving change, yeah. Then about ten years later, companies started selling APIs as the product itself. Stripe's whole business was an API. And its customers' code was charging real credit cards. So Stripe couldn't break that code. Ever, really. But it also couldn't stop improving the API. And its answer was to version the API by date, and pin every account to the version it started on. That became one of the most copied ideas in API design. And you're going to build a small version of both of those ideas. Fielding's and Stripe's.

<!-- section: The Idea: Two lifecycles -->

A: So let's put the two lifecycles side by side. Picture two strips, one above the other. The top strip is the API as a product, and it's measured in months, or years. Nine boxes, left to right. Design, build, document, test, release, observe, version, deprecate, retire. And there's a line that loops from observe all the way back to design, because what you learn from watching real usage feeds the next design. And each version eventually walks off the right edge. Deprecate, then retire.

B: And the bottom strip's the request.

A: The bottom strip is one request inside the server, measured in milliseconds. Client, then T L S, the encryption layer. Then routing. Then a box of what's called middleware, auth and rate limiting and logging. Then validation, then your handler, then turning the answer into JSON, then the response. And there are dashed lines connecting the two strips. Design, up top, points down at the middleware and at validation. Because design decides the rules, and the pipeline enforces them. And version, up top, points down at routing. Because the URL is what picks which version you're talking to.

B: Okay. And when you say API, you mean, like, specifically the URLs?

A: The word's a bit broader than that. An API, application programming interface, is just the set of requests one program agrees to accept from another, and what it promises to send back. For a web API, that's the URLs, the methods, the request bodies, the responses, and the errors. All of it. It's the promise, spoken over H T T P. And what makes it hard is the same thing that made the web hard in two thousand. Once somebody else's code depends on your promise, you can't take it back on your own schedule.

<!-- section: The Idea: Design -->

A: So start with the long lifecycle, and start at the beginning. Design. And the main idea of design is: write the contract before the code. The contract is the promise in writing. Every path, every field, every type, every status code, every error. Clients get written against it, and the server gets tested against it.

B: [skeptical] But FastAPI already spits one out for you. You write your Python, and it generates the whole spec. Why would I write it by hand first?

A: You can do it that way. And honestly, most frameworks, FastAPI included, will generate it from your code. But teams that really care write it first, and for the same reason you write a test before you fix a bug. It forces you to decide what you're promising, before the implementation decides it for you. If you generate it afterward, the spec just describes whatever your code happened to do. Including the accidents.

B: Like ignoring unknown fields.

A: Like ignoring unknown fields, yeah. Nobody decided that. It just happened. So the standard language for writing a contract is called Open A P I. It used to be called Swagger, you'll still see that name around. It's one YAML file, or JSON, that lists every path, and describes every request and response body using something called JSON Schema. Which is just a vocabulary for describing the shape of JSON. Which fields exist, what type each one is, which ones are required, what ranges are allowed. And the nice thing is, from that one file you get a lot for free. Human-readable docs. Client libraries in different languages. Request validators. Mock servers. And the input for the contract test you'll write later. So when people say contract-first, that's all it means. The YAML exists before the Python does, and the Python gets checked against it.

A: And there are a few decisions that show up in basically every contract. Each one's cheap to get right on day one, and expensive on day four hundred, because by day four hundred somebody depends on the wrong version of it. First one is names. In the classic REST style, URLs name things. Nouns. And the H T T P method says what you're doing to the thing. So a GET on slash v one slash models lists the models. A GET on slash v one slash models slash llama eight B fetches that one. A POST on slash v one slash chat slash completions creates a completion. And then you pick one convention and you never mix. Snake case for field names, lowercase with underscores, because that's OpenAI's choice, so it's yours. Plural names for collections. And the same word for the same idea, everywhere. If it's max tokens in one endpoint, it can't be max tokens in camel case in another one, or token limit in a third. Consistency is what lets a client guess right without reading the docs.

A: Second one, pagination. Any list that can grow has to be paged from day one.

B: Why day one, though? If my list of models is three things, I'll just add paging when it gets big.

A: Because adding it later changes what that endpoint returns. Today a GET on models gives you the whole list. Tomorrow it gives you the first page and a pointer to the next. And every client that read the whole list now silently reads part of it. So that's a breaking change, for something you could've done up front. And there are two styles. Offset pagination is "give me items two hundred to two ninety-nine." Skip two hundred, take a hundred. Simple. But it's slow on big tables, and it drifts. If someone inserts rows while you're paging through, you'll skip some or see some twice, because everything after the insert just shifted by one.

B: Oh, right, because "item two hundred" isn't the same item anymore.

A: Yeah, exactly. The other style is cursor pagination. The server gives you back an opaque token that points just past the last item it sent. And you hand that token back to get the next page. That's stable when things get inserted, and it's fast. The catch is you can't jump straight to page fifty. And that's what most big APIs use. OpenAI's list endpoints take an "after" ID, and tell you "has more", true or false. And the reason cursors are fast, you'll see in the indexes lesson, but the short version is this. A database keeps its index as a sorted tree, a B-tree. So "give me rows after this ID" is one hop down the tree to the right spot, and then you just read forward. Whereas "skip a million rows" means actually walking past a million rows to get there.

A: Third decision. And this one matters a lot for you. Errors, in one shape. Every error from every endpoint should look the same, so a client only has to write one error handler. And since your server speaks OpenAI's dialect, its errors should look like OpenAI's. Which is a JSON object with one key, error, and inside that, four fields. Message, which is a sentence for humans, like "max tokens must be at most four thousand ninety-six." And that can change whenever you want. Then type, like "invalid request error", and code, like "invalid value." Those two are for programs, so they're part of the contract. You don't get to reword them. And param, which says which field was wrong.

B: And the status code on top of that?

A: The status code carries the category. Four hundred is "your request is wrong." Four oh one is "who are you?" Four oh three is "I know who you are, and you can't do that." Four oh four, no such thing. Four oh nine, conflict. Four twenty-nine, slow down. Five hundred, our fault. Five oh three, we're overloaded. And if you're not tied to someone's dialect, there's actually a standard for the error body. It's called Problem Details, it's R F C ninety-four fifty-seven, from twenty twenty-three, replacing an older one. Fields like type, title, status, detail. But you are tied to a dialect, so you use OpenAI's. And the worst possible choice is the one FastAPI makes by default. Which you'll measure. When a request fails validation, FastAPI returns a completely different shape, a key called detail with a list inside it, and a different status code, four twenty-two, from everything else your API returns.

B: So a client written for OpenAI gets a shape it's never seen.

A: A shape and a code it's never seen. We'll come back to what that does to the SDK.

<!-- section: The Idea: Idempotency -->

A: Okay. Now the one that really matters for an inference server. Retries. A network call can fail in three ways. The request never arrived. Or it arrived and the server failed. Or, and this is the nasty one, it arrived, it succeeded, and the answer got lost on the way back. And from the client's side, that last case looks exactly like the first one. You sent something, you heard nothing. So what do you do?

B: You retry.

A: You retry. Every good client retries. The OpenAI Python SDK retries twice by default, on timeouts, connection errors, and a handful of status codes. Four oh eight, four oh nine, four twenty-nine, and anything in the five hundreds. That's from reading the SDK's source, so it's worth checking for whatever version you've got.

B: [casual] Okay, but retrying seems harmless. Worst case the server answers twice and I ignore one of them.

A: For some requests, sure. There's a word for operations where that's true. Idempotent. Doing it twice has the same effect as doing it once. Setting x to five is idempotent. Do it ten times, x is five. Adding five to x is not. And H T T P actually defines GET, PUT and DELETE as idempotent. POST, it doesn't. And a POST to chat completions definitely isn't, because every POST runs the model again. On a payments API, a retried POST charges the card twice. On yours, it burns GPU time. And if the temperature's above zero, it comes back with a different answer to what the client thinks is the same request.

A: So try this. A client calls your server with the OpenAI SDK. Timeout of one second, max retries two. Your model, a fake one, takes two seconds to answer. How many times does the model actually run before the client gives up?

B: [working it out] The first one times out at one second... and then it retries. So, two? Or, well, the server probably notices the client's gone and stops. So maybe really just one that finished.

A: [amused] Three. And all three run to completion. Here's the thing, the server doesn't know the client left. It's just generating. The client times out after a second, waits a moment, sends attempt two, which also times out, then attempt three. Same thing. And every one of those runs to the end on the server, and then the client gets an error anyway. When this was measured, it was three generations, about four point three seconds of the client's time, and zero useful answers.

B: [winces] That's just pure waste.

A: [grimly] And it gets worse. On your real server there's a GPU lock, so requests run one at a time. Now attempts two and three don't run alongside attempt one. They queue behind it. They wait, and then they run. So everyone else's line just got two ghost requests longer. Two full generations nobody's going to read. And that's the retry storm from the rate limits lesson. The busier you are, the more things time out, the more things retry, and the busier you get. Retries make overload worse.

A: So the fix, and Stripe's the one who made this popular, is an idempotency key. The client makes up a random ID, a U U I D usually, once per logical request. Not per attempt. Per thing it's trying to do. And it sends that same ID on every retry, in a header called Idempotency-Key. And the server keeps a small table. The key, a hash of the request body, a status, and the saved response. The first request claims the key. A retry finds it already there.

B: And then what does the retry get back?

A: Depends on timing, and it's easiest to picture as three people standing in columns, like a sequence diagram. Client on the left, server in the middle, the key store on the right. Attempt one goes across with key K. The server writes K into the store, marked running, and starts generating. That's two seconds. At the one second mark, the client times out and sends the retry, same K, same body. The server checks the store, sees K is still running, and sends back four oh nine, "still in progress." And the SDK retries four oh nines, remember. Meanwhile the first generation finishes, and the server writes "K, done," with the saved response. By attempt three, the server finds K done, and just replays the saved response. A two hundred. No GPU work at all. The GPU ran once.

B: Okay, that's clean. That's actually really clean.

A: And there are three details that make it correct, instead of approximately correct. First, hash the body. If the same key shows up with a different body, that's a client bug. It reused a key for a new request. And you should return an error, not replay some unrelated answer. Stripe does this. And there was a draft standard for this header, and it suggested four twenty-two for "same key, different body", and four oh nine for "still running."

B: [thinking out loud] And the claim itself is just... check if the key's in the table, and if it isn't, insert it?

A: [jumping in] That's the obvious way, and it's broken. Think about two retries arriving at the same moment. Both check. Both see nothing there. Both insert. Both run the model. There's a gap between the check and the insert, and two requests can both fit through it. It's the same race from the threads lesson, where two threads both read a counter before either of them writes it back. So you don't do check-then-insert. You do one statement. Insert this key, and if it already exists, do nothing. And then you look at how many rows that statement actually inserted. One means you claimed it. Zero means someone else got there first. The database makes that one step, so there's no gap.

B: Got it. One statement, not two.

A: One statement. Third detail, scope and expire. Keys belong to an API key. Never global. Otherwise Alice's retry could replay Bob's response. And they expire. Stripe documents that keys can be pruned after twenty-four hours. Because you're storing a whole response for every request, so without some time to live, that table just grows forever. And a footnote on the header itself. Idempotency-Key was on its way to being an official internet standard. That draft actually expired without ever becoming one. But the name and the behaviour stuck anyway. Stripe uses it, lots of payment and cloud APIs use it. It's a convention everyone follows.

<!-- section: The Idea: Authentication -->

A: Next, who's calling. That's authentication. Working out who's making the request. And then authorization is the next question, which is, okay, is this caller allowed to do this? And on APIs, authentication usually comes in one of three forms. The simplest is an API key. A long random secret string, sent on every request in the Authorization header, as "Bearer" and then the key. Whoever holds it is that caller. That's what OpenAI uses, what Fireworks uses, what your server uses.

A: And there are a few things worth doing with keys. Store only a hash of each key, never the key itself, so if your database leaks, the keys don't. Compare them in constant time. Give them a readable prefix, so if one leaks into a log or a git commit, you can spot it. And let each caller have several, so they can rotate to a new one without downtime.

B: Wait, constant time? Why would comparing two strings ever not be constant time?

A: [thinking out loud] So, the normal comparison stops at the first character that doesn't match. So a guess that gets the first ten characters right takes a tiny bit longer to reject than one that's wrong at character one. And with enough attempts, an attacker can measure that, and recover a secret one character at a time. Constant-time comparison always looks at the whole thing, so the timing gives nothing away.

A: The second form is O Auth. That's for when a third-party app acts on behalf of a user. "Let this app read my GitHub repos." The user approves on GitHub's own site, and the app gets back a short-lived access token with limited permissions, called scopes. Never the user's password. And it's overkill for a model server with three clients you know personally. The third form is a J W T, a JSON Web Token. That's a small signed JSON document that carries its own claims. Like, "this is user forty-two, scope chat, expires at three p m." And the server checks the signature with a key, instead of looking anything up in a database. Which is why they scale across lots of servers. The cost is you can't easily revoke one before it expires, so they're kept short-lived. And O Auth's access tokens are very often J W Ts.

B: And for the Spark, keys.

A: Keys. And each key also gets a name, a rate limit, and, soon, a record of which API version it's calling. And that last part is what makes deprecation possible later. You can't email the people still on version one if you don't know who they are.

<!-- section: The Idea: Build, document, test, release, observe -->

A: The middle five stages, build, document, test, release, observe, are where most of the engineering time goes. And each one has one idea worth knowing by name. Build against the contract. Either you generate your server's data models from the Open A P I file, there are tools that turn schemas straight into pydantic classes, or you write them by hand and test that they match. Either way, the YAML is the source of truth. Document from the contract too. Docs generated from the YAML can't drift from it. Docs written by hand will. You'll generate a whole docs page with a tool called Redocly, one command. And good docs add the things a schema can't. An example request for every endpoint. Every error code, and what to actually do about it. And a changelog.

A: Then test. But test for the contract, not just for correctness. A contract test checks the interface rather than the logic.

B: [a bit unsure] How's that different from a normal test, though? A test checks the server does the right thing.

A: Okay, so, a normal test asks "is the answer right?" A contract test asks "does the server still keep its promise?" Does it accept what the contract says it accepts. Does it return what it says, with the right status codes and the right fields. It doesn't care if the model's answer is any good. It catches breaking changes, not wrong answers. And it comes in two flavours. In the first, the server checks itself against its own spec. There's a tool called Schemathesis that reads your Open A P I file and generates hundreds of requests straight from it. In the second, each client writes down the exact requests it sends and the exact fields it reads from the response. And the server has to keep all of those passing, in its own test suite. That's called consumer-driven contract testing. Pact's the best-known tool for it. And that second flavour is the one that would've caught your rename.

B: Because it's written down from what bench dot pi actually does.

A: Right. It encodes what a real client really sends, not what you think it sends. Then release. Release happens in stages. Beta means "the shape might still change, don't build a business on this." G A, general availability, means "this is the promise. From now on it only changes by the rules." That's the moment the clock starts. And you announce in a changelog, every time. And then observe. And the A P I specific part of observing is the labels. For each route, you record the request rate, the error rate split by status code, and latency percentiles. People call those the RED metrics. Rate, errors, duration. And you tag every one of them with the API version and the key name. Then "who's still on version one?" is a query, not a guess. And if one key suddenly jumps in four hundreds the day after a deploy, that tells you exactly whose integration you just broke.

<!-- section: The Idea: Versioning -->

A: Okay, versioning. What you're allowed to change without asking. Once you're G A, every change is one of two kinds. An additive change adds something new without touching what's already there. A new endpoint, a new optional field in the request, a new field in the response. Every client that worked before still works. That's safe, in principle. A breaking change is one where some correctly written client stops working, or, worse, silently gets different results. Removing or renaming a field. Making an optional field required. Changing a type, or a default, or what a status code means. That needs a new version.

A: So let's run some. Your chat completions endpoint. One. You add an optional top p field to the request.

B: Safe. Old clients don't send it, nothing changes for them.

A: Right. Two. You add a new field to every response. System fingerprint.

B: Also safe. Nobody's reading it yet.

A: Safe for any client that ignores fields it doesn't know, which is most of them. But a client that strictly validates the response against a schema will choke on the extra field. So mostly safe. Three. You add a new value for finish reason. Today it's "stop" or "length." Now it can also be "content filter."

B: That's... also additive, right? You added a value.

A: [hesitating] Mm, that's the classic grey zone. It's "just a new value." But picture a client with a match statement over finish reason, a case for stop, a case for length, and no default branch. Now it hits content filter and crashes, or does something weird. Stripe deals with this in its docs by marking every enum, every one of those fixed lists of values, as either open, meaning it might grow so write a default branch, or closed, meaning it's fixed. Four. You change the default for max tokens, from two fifty-six to five twelve.

B: [confident] That one's fine. Nobody's request breaks, they just get longer answers.

A: [gently] And that's exactly why it's the dangerous one. It's breaking, and silently. Every client that relied on the default suddenly gets answers that are longer, slower, and more expensive. With no error. Same family as your rename. Five. You start rejecting requests that contain fields you don't recognise.

B: Breaking. Anyone who's always sent some extra field you always ignored now gets a four hundred.

A: Right. So the pattern across all five: "breaking" isn't about what you meant to promise. It's about what clients actually rely on. And that idea has a name. Hyrum's Law, from Hyrum Wright, an engineer at Google. With enough users, it doesn't matter what you promise in the contract. Every observable behaviour of your system will be depended on by somebody. The order fields come back in. The exact wording of an error message. How long a request takes.

B: So I can't win.

A: [laughs] You can't stop it. You can, well, you can make it less likely. Document clearly what's guaranteed and what isn't. Tell clients to be what Martin Fowler called tolerant readers, clients that read only the fields they need and ignore everything else, so extra stuff can't break them. And test the contract, not the implementation.

A: Then, where do you put the version? There are two common places. In the URL, slash v one slash chat slash completions. Or in a header. Anthropic's API takes a header called anthropic version, and its value is a date. Stripe does the same, Stripe-Version. And it's a real trade-off. The URL version is visible in every log line, every curl command, every browser bar. And routing is trivial. It's just a path. So it's easy to send version one and version two to completely different servers. But it's coarse. Version one, version two, rarely a version three. That's OpenAI, and most public APIs. Header versioning keeps one URL, and the app reads the header and adapts. You only see the version if you print the headers. But it can be really fine-grained. A new version every month. That's Stripe, Anthropic, and GitHub, which has used date versions since twenty twenty-two.

A: And Stripe's date versioning is the famous one, so it's worth getting right. A Stripe API version is a date. Your account has a default version. Your requests use that default, unless you send the Stripe-Version header to override it, which is how you test an upgrade before you commit to it. So code written in twenty nineteen keeps getting twenty nineteen behaviour, until somebody upgrades it on purpose.

B: [skeptical] Wait, so Stripe is running, like, a separate copy of the whole API for every date? That's hundreds of copies.

A: [jumping in] No, no. And the way they avoid it is the clever bit. Brandur Leach wrote it up on Stripe's blog in twenty seventeen. Inside Stripe, the code is written for the newest version. Only the newest. And every breaking change ships with a small module, a version change, that knows how to transform a new-style response back into the old shape. So when a request comes in from an account pinned to an old date, the response is built the new way, and then it walks backwards through those little modules, one by one, until it matches the caller's version. And the scheme has evolved since. Starting with a release at the end of September twenty twenty-four called acacia, Stripe ships a monthly version with no breaking changes, and a major release with breaking changes twice a year. Each major gets a name. Acacia, then basil, and so on. So version strings now look like a date plus a name. The details keep changing, so check Stripe's docs. The idea that matters is the pin.

B: The pin, and the backwards adapters.

A: Right. And whichever way you version, build it like this. Picture old bench dot pi on the top left, still sending max tokens two fifty-six, written years ago. And a new client on the bottom left, sending max completion tokens, written today. Each one goes into its own thin adapter. The version one adapter turns max tokens into a limit, and also stamps on deprecation headers. The version two adapter turns max completion tokens into that same limit, and it's strict about fields. And both adapters feed into one core on the right. One function, generate, given the messages and a limit. One GPU lock, one model. Tested once, used by both. So fixing a bug in the core fixes it for everyone, and a breaking change only ever touches an adapter.

B: As opposed to copying the server.

A: [laughs] The worst version of versioning is copying the whole server into a v two folder and then fixing every bug twice for three years.

<!-- section: The Idea: Deprecate, then retire -->

A: Then the end of the life. Deprecation is the announcement. It still works, but it's going away, so stop using it. It's a warning, not a change in behaviour. Retirement, or sunset, is the end, the date after which it stops working. And the gap in between is the migration window. Months for a public API. Often a year or more for anything that touches money.

A: And there are H T T P headers that carry this right in the response, so a client can notice without anyone reading an email. One's literally called Deprecation. It's a newish standard, R F C ninety-seven forty-five, from March twenty twenty-five. It says when the thing was, or will be, deprecated. And the format is an at sign followed by a Unix timestamp, so, seconds since nineteen seventy. Another's called Sunset, R F C eighty-five ninety-four, from twenty nineteen. It says when it stops working. But it uses the older H T T P date format, like "Sunday, thirty-one January, twenty twenty-seven." Different format from the other header. And the newer standard literally says that mismatch is there "for historical reasons."

B: [amused] Of course it is.

A: [laughs] Of course it is. And then a Link header, pointing at your migration guide. And the important thing is none of these change behaviour. The response is still the full, correct version one response. They're a hint. And a client that logs a warning when it sees one is a client that migrates in time.

A: Now the uncomfortable part. Telling people isn't enough. There's an interactive chart for this that's worth describing. Time runs left to right, three years of months. Across the top, two bands. Version one goes design, beta, G A, deprecated, gone. Version two starts with its own design and beta, and goes G A right at the moment version one gets deprecated. Below that, two lines, number of clients. Black is clients on version one, blue is version two. And you get two sliders. When to deprecate, and how long the window is. And two toggles. Send deprecation headers and emails. And run brownouts before the sunset. And it's a toy model, two hundred made-up clients, but the shape's real.

B: And what do you see when you play with it?

A: [working it out] So with the defaults, deprecate at month eighteen, six-month window, nobody told... about four out of five version one clients are still there on sunset day, and they all break. Turn on the headers and emails, and that drops to about two in five. Add brownouts too, and it's about a third. Stretch the window to a year with both on, and you're down to about one in ten. And two things should feel obvious after a minute of dragging. First, migration has a long tail. The first seventy percent of clients move quickly. The last ten percent take forever. And some never move until something breaks. Second, the only reliable way to find the clients nobody's watching, like a cron job written by someone who left the company, or a notebook running on a VM everyone forgot about, is to break them. Briefly. On purpose.

B: [skeptical] You deliberately take your own API down? That sounds like the exact thing you're trying to avoid.

A: It's a planned, short, announced outage. Say an hour at a time, before the sunset. It's called a brownout. And the point is that the owners of those forgotten clients notice errors while there's still time to fix them, instead of on sunset day when it's permanent. An hour of errors in March beats a dead integration in June. GitHub, among others, has run scheduled brownouts before removing old behaviour. And then after the sunset, the old URL should answer with four ten, which means "gone." With a message pointing at version two. Not four oh four. Because "this existed and we removed it on purpose" is way more useful than "never heard of it."

<!-- section: The Idea: REST, RPC and GraphQL -->

A: Everything so far applies whatever style of API you build. And there are three common styles. REST is the one we've been talking about. URLs name resources, H T T P methods act on them, and the contract is Open A P I. It wins for public APIs. Responses are easy to cache, you can poke at it with curl, and every language on earth has an H T T P client. It costs you some over-fetching and under-fetching, getting more fields than you wanted or needing three calls to get what you wanted. And endless arguments about whether something's really a resource.

A: Then R P C, remote procedure call. The idea is making a call to a function on another machine look like a local function call. The modern big one is G R P C, Google's open-source R P C framework, released in twenty fifteen. The contract lives in proto files, Protocol Buffers. It wins for service-to-service traffic. Compact binary encoding, H T T P two, streaming, and generated client code. It costs you human readability, and it's awkward from a browser. And R P C is actually older than REST.

B: [thinking out loud] Wait, so where does OpenAI's API fit? I'd always assumed it was REST. It's URLs and JSON.

A: [amused] Honestly? A POST to chat slash completions is R P C wearing REST's clothes. A completion isn't really a resource you go fetch later. It's a function call. Generate this. And that's fine. Most real REST APIs are just pragmatic H T T P plus JSON, and nobody serious is going to argue with you about it in an interview, as long as you can name the trade-offs.

A: And the third one is GraphQL. It came out of Facebook in twenty twelve, open-sourced in twenty fifteen. One endpoint. The client sends a query that names exactly the fields it wants, across linked objects, in one request. The contract's a typed schema. It wins when you've got lots of different front ends that each want a different slice of linked data, in one round trip. It costs you caching, which is hard, and it's easy to write one query that costs the server a fortune, so rate limiting has to be by cost, not by count. And here's the interesting part for this episode. GraphQL evolves without versions, by design. You add fields, and you mark old ones deprecated. And since clients only ever get what they asked for, a new field can never surprise anyone.

<!-- section: The Idea: OpenAI-compatible -->

A: Which brings us to your server's situation. Why did "OpenAI-compatible" become the standard? Nobody voted on it. OpenAI shipped the first LLM API most developers ever used. Their official SDKs let you change the base URL. And every competitor realised the fastest way to win a customer was to require zero code changes to try them. So V L L M, S G Lang, llama dot C P P's server, Ollama, Fireworks, Together, and plenty more all serve chat completions with OpenAI's shapes. And Anthropic and Google both publish OpenAI-compatible endpoints alongside their own APIs. It's what's called a de facto standard. A standard by adoption, not by committee. Nobody owns it. Everybody follows it because everybody else does. Every tutorial, every SDK, every eval harness and agent framework speaks the same JSON.

B: And for me that means what, practically?

A: Three things, really. First, you don't own your contract. OpenAI does, and it changes it on its own schedule. Max completion tokens replacing max tokens. New fields in usage. The newer Responses API sitting next to chat completions. Compatible is a moving target. So pick a subset, write it down in your Open A P I file, and say in your docs which subset it is. Second, the error shape is part of being compatible. The OpenAI SDK turns status codes into exception classes. A four hundred becomes a Bad Request Error. Four oh one is an Authentication Error. Four twenty-nine is a Rate Limit Error. And it decides whether to retry based on the status code. So if you return FastAPI's default four twenty-two for a bad request, the SDK raises an Unprocessable Entity Error instead. And a client written against OpenAI, catching Bad Request Error, doesn't catch it.

B: So the four twenty-two isn't just ugly. It actually slips past their error handling.

A: It slips right past. And the flip side, return four oh nine for "still running," and the SDK retries it. Which is exactly what you want for idempotency. Third, fidelity's in the details. The streaming format. The little "done" line at the very end of a stream. Usage stats in the last chunk. The finish reason values. You saw in the Fireworks lesson that clients depend on every one of those. Hyrum's Law applies to OpenAI's API, with its millions of users, and so it applies to yours.

<!-- section: The Idea: The life of one request -->

A: Okay. Now zoom in. From months to milliseconds. Every promise from the long lifecycle gets enforced somewhere between the network socket and your handler. And there's an interactive figure here that's basically a row of eleven buttons, one per stage. Click a stage, and it tells you what it does and which status codes it can return. And there's a second row of buttons that send a request. A good one, one with no key, one with broken JSON, one that's over the rate limit, a duplicate, one with a bad body, one that crashes the handler. And you watch each request light up the stages one by one, until a stage answers it and it stops. And the thing to notice is how few make it to the handler. Most requests are answered before your code ever runs. That's the point.

A: So, from the outside in. First, T L S termination. Something decrypts the H T T P S. And usually that's not your Python at all. It's a reverse proxy like Caddy or engine X, or a cloud load balancer, or tailscale serve. And it hands your app plain H T T P on localhost. Your app never sees a certificate. The A P I design point is that the proxy also owns timeouts. So a five oh four, "gateway timeout," can come from a layer your app never even saw. A five oh two means your app's down. And if the encryption handshake fails, there's no status at all, the connection just dies.

A: Then a stage that stamps a request ID on the request, starts a timer, and on the way out writes one log line. Route, key name, status, how long it took. It never says no. It just watches. Then routing. The method and the path pick a function. Post to slash v one slash chat slash completions goes here. And this is where version one versus version two gets decided, because the version's in the URL. Routing's where four oh four comes from, no such path. And four oh five, wrong method, like a GET on a route that only takes POST. And, once you've retired something, four ten. Then reading and parsing the body. With a size cap. Four thirteen if it's too big, four fifteen if it's not JSON, and a four hundred if the JSON's broken. Except FastAPI's default makes that a four twenty-two. And in FastAPI, this parsing happens before your dependencies run. Hold on to that.

A: Then middleware. Middleware is code that wraps every request. It runs before the handler, and again after it, and the handler doesn't know it's there. You use it for anything that applies to every route. Logging, auth, adding headers. The logging piece sits outermost, so it sees every outcome, including the failures. Then auth, which gives you four oh one, missing or unknown key, or four oh three, a real key that isn't allowed to do this. Wrong scope, or a model that's been disabled for it. And then rate limiting, which gives you four twenty-nine. And that has to come after auth.

B: Because it needs to know whose limit it is.

A: Because it needs to know whose bucket. It's your token bucket from the rate limits lesson. Quick reminder of how that works. Each key has a bucket of tokens that refills at a steady rate, say one a second, up to some maximum, the burst. Every request takes a token. Bucket's empty, you get a four twenty-nine, with a Retry-After header saying how many seconds to wait, and some rate limit headers saying how many you've got left. And that bucket's keyed by API key, so auth has to run first.

A: Then validation. Does the body actually match the schema? Required fields there, types right, numbers in range. If not, four hundred, with param naming the bad field. Then idempotency. And it sits after validation, so invalid requests never get a stored answer. Stripe's docs describe the same rule. And it sits before the handler, so a replay skips the GPU entirely. Then the handler. Your actual code. Chat template, the GPU lock, generate. And by now it only ever sees requests that are well-formed, authenticated, within budget, and not duplicates. It can still return a five hundred if there's a bug, or five oh three if you're overloaded and the queue's full, or five oh four if you enforce a deadline. Then serialization. Python objects to JSON, or to server-sent events if it's streaming, which is just a long-lived response that sends a series of small messages. And optionally, you check your own response against your own schema before it leaves. If it doesn't match, five hundred. Better you find out than the client. And then the response goes out with its headers. Request ID, the rate limit headers, Deprecation and Sunset on version one. And that log line gets written now, with the final status and the latency. Which is where all the per-endpoint metrics come from.

A: Okay, so, here's one to try. In FastAPI, you put auth in what's called a dependency on the route, a function that runs before your handler. A client with no API key at all sends a body that isn't even valid JSON. Just a curly brace and the word nope. Which error does it get? Four oh one, or a validation error? And then, no key, but valid JSON that's just missing the messages field?

B: [confident] Four oh one both times. Auth comes first. You don't even look at the body if you don't know who it is.

A: [amused] That's the order you'd draw on a whiteboard. And it's... not what happens. On FastAPI zero point one forty-three, broken JSON with no key comes back four twenty-two. A validation error. Because FastAPI reads and parses the body before it runs your dependencies. So the auth check never ran. But valid JSON missing messages, no key, that comes back four oh one. Parsing succeeded, the dependencies ran, auth said no before the body ever got checked against the schema.

B: Huh. So the real order is parse, then auth, then validate.

A: In FastAPI, yeah. Frameworks have their own order, and it isn't always the one you'd draw. And it matters in two ways. Anonymous callers, people with no key at all, can make you parse huge bodies. So cap the body size at the proxy. And your error handler has to rewrite both of those paths into the OpenAI shape, not just one.

B: [working it out] So the order's basically... cheap stuff first, then who are you, and then the expensive stuff.

A: That's most of it. Cheap checks that reject the most traffic go first. Anything that needs to know who you are goes after auth. Anything that costs real money, which is the GPU, goes last. And the outermost layer, logging, wraps all of it. Because the requests you most need to see in your logs are exactly the ones that got rejected.

<!-- section: Build It -->

A: So here's what you build. You extend your inference project with an API layer, and the whole thing runs on your Mac, with a fake model. Then at the very end, you point it at the real one on the Spark. There's a folder next to your server and bench dot pi with the contract, a core, the error handling, the keys, the idempotency store, the app with its two versions, and a little folder of contract tests.

A: Step one's setup. A virtual environment, install FastAPI, uvicorn, the OpenAI SDK, a few others. And then a fake model. It's a function called generate, with exactly the same signature the real one will have. Model name, messages, limit. It sleeps for a configurable amount of time, set by an environment variable called fake seconds, so you can make it slow on purpose. And then it returns a properly shaped chat completion, which is just the word hello, repeated limit times. With finish reason "length," and usage numbers. And the part that matters is a little global counter that goes up by one every time generate runs. That's your "how many times did the GPU actually run" number. Everything about idempotency gets measured with that counter. And this whole lesson does non-streaming responses. Streaming plus idempotency is its own can of worms, which comes up later.

B: So the whole API layer's testable in milliseconds, no GPU.

A: In milliseconds. Step two is the contract. You write the Open A P I file for the subset of chat completions your server actually supports, before you touch the app at all. You get a frame. The bearer token security scheme, and the one schema that's the same for every endpoint, the error object, with message and type required, and param and code allowed to be empty. And the rest is yours. The optional Idempotency-Key header. The request schema, the response schema. Every error status you return. And the real work is deciding, and writing into the schema, every limit you'll enforce. Messages has to have at least one item. Max tokens has a minimum and a maximum. Temperature has a range. Which roles exist. Which finish reasons you can ever return. The four twenty-nine response has a Retry-After header. Every error status points at the same error schema.

B: That's a lot of decisions before writing any code.

A: Those decisions are the design. That's the whole point of the step. Then you lint the file with Redocly, and build docs from it. When this was done for the lesson, the lint passed with one warning, no license listed, and the docs came out as a single H T M L file, about sixty kilobytes. And then you read your own docs as if you were a stranger. Anything you'd have to ask about is missing from the spec.

A: Step three. Validation, and one error shape. And you start by feeling the default. Write the version one route with a pydantic model that mirrors your spec, and no custom error handling. Then use the OpenAI SDK with retries turned off, and send it an empty messages list. Look at what exception you get, and what the body looks like. Then you write the errors file. One exception class of your own, with a status, a message, a type, a code, a param, and optional headers. And four handlers, so every failure leaves the server in the OpenAI shape. One for your own errors. One for validation failures and broken JSON, which turns them into a four hundred with param filled in. One for the four oh fours and four oh fives that come out of routing. And a catch-all for crashes, which returns a five hundred with a generic message and the request ID, and sends the actual stack trace to your log.

B: Why not put the actual error in the five hundred? That'd be way easier to debug.

A: [dryly] Easier for you, and for everybody else too. Stack traces leak file paths, library versions, and sometimes actual data. So the client gets "internal error, here's a request ID," and you look that ID up in your own log. And there are a couple of hints for the validation handler. FastAPI gives you a list of errors, and each one has a location, like "body, then messages." You drop the first part and join the rest with dots, and that's your param. And broken JSON shows up through this same path, with its own error type, so you give it its own code. When it's done, you rerun the SDK call. With the default handler it was Unprocessable Entity Error, four twenty-two, with that detail list. With yours, it should be a Bad Request Error, four hundred, and its body has your param and your code.

A: Step four's the idempotency store. You use S Q Lite, a small database that's just a file. It survives a server restart, and a single insert statement is atomic, so you get that one-step claim for free. The table has the owner, meaning which API key, then the idempotency key itself, a hash of the request body, a status, the saved response body, and when it was created. And the owner and key together are the primary key. So keys are per caller, never global. Status zero means running. Anything else is the saved H T T P status. Then one function wraps the handler. No key? Just do the work. Otherwise, hash the body. And you hash it with the keys sorted, so the same request always hashes the same way. Then insert, and do nothing if it's already there. If you inserted one row, you claimed it. Run the work, save the status and the response. If you didn't claim it, three cases. Different hash, four twenty-two. Status zero, it's still running, four oh nine. Otherwise, replay the saved response, with a header saying "idempotent replayed, true."

B: And if the work itself throws halfway?

A: Then you delete the row and re-raise. So a retry can actually try again, instead of getting a stuck "running" forever, or a saved failure. And that's a policy choice, so you write it down. Two policies, actually, in the spec, in the header's description. How long keys live. Stripe documents twenty-four hours. And whether a failed request's key gets released, which is what we just did, or its error gets saved and replayed. Stripe's version one API actually saves and replays even five hundreds. And then a cleanup that deletes anything older than your time to live. Then you test it the way it'll really get used. Start the server with fake seconds at two. Call it from the SDK with a one-second timeout, four retries, and an Idempotency-Key header set to a fresh U U I D. And afterwards, read that generation counter from a little debug endpoint. Then do the same thing with no key, and compare.

A: Step five. Keys, and rate limits per key. There's a tiny script that makes a key. It generates "w b underscore" plus a long random string, prints it once, and stores only its hash, along with a name, a rate of one request a second, and a burst of five. If you lose the key, you make a new one. Then the keys file is yours. It's a FastAPI dependency. It reads the Authorization header, hashes the key, looks it up, and either returns the key's record or raises a four oh one. And missing and unknown get different codes, so the client can tell "you forgot the header" from "that key's wrong." Then it takes one token from that key's bucket. And that bucket needs a lock around it.

B: Why a lock? Python's got the GIL.

A: [jumping in] The GIL only protects Python's own internals, not your logic. FastAPI runs ordinary, non-async handlers on a pool of threads. So two requests from the same key can be in that bucket code at the same moment, both read "one token left," and both take it. That's the same read-then-write race as the idempotency claim. So a plain threading lock around the take. Out of tokens, four twenty-nine, with Retry-After in whole seconds. And on success, you set rate limit headers named the way OpenAI names them. Limit, remaining, and reset, for requests. So a well-behaved client can slow down before it hits the wall. Check OpenAI's docs for exactly what each one means. The names are what matter for compatibility. And two details. Compare the hashes with the constant-time compare from Python's H M A C module. And decide whether a request that fails validation still costs a token. In the lesson's version it did, because auth and the bucket run before the body gets validated. And that's defensible. Otherwise invalid requests are free to spam.

A: Step six is the fun one. You break it the wrong way, on purpose. In the version one model, rename max tokens to max completion tokens, with a default of sixteen. Restart, run bench dot pi for a handful of requests, and look at completion tokens in its results. Sixteen, every time. Nothing errored. And then you write two guards, and either one would've stopped this. The first is a consumer contract. A test file that sends exactly the requests bench dot pi sends, same fields, same headers, and checks exactly the fields bench dot pi reads. And the one test that catches this break sends bench's normal body with max tokens set to seven, and checks two things. The status is two hundred, and completion tokens is at most seven. After the rename, it comes back sixteen, and the test fails. Then you add one test for every behaviour bench dot pi depends on. The error shape on a bad key. The finish reason values it switches on. The usage fields. And you run them with FastAPI's test client, against the app object directly, so you don't even need a running server.

A: The second guard's a spec diff. A little script that takes the old Open A P I file and the new one, walks through both, and prints every breaking difference. Exits with failure if there are any. It follows references on both sides, flags any type change as breaking, and then the rules split. On the request side, a property that got removed is breaking, because clients still send it. Something newly required is breaking. And an enum losing a value is breaking. On the response side, a property removed is breaking, because clients still read it. And an enum gaining a value is a warning, because strict clients might choke.

B: [working it out] Wait, so on requests, losing an enum value is the problem, and on responses it's gaining one. They're flipped.

A: They're flipped, because the direction's flipped. On a request, the client's the one choosing values. If you take one away, a client that sends it breaks. On a response, you're choosing. If you add one, a client that's never seen it might break. That's the content filter thing from before. The lesson's version of that script was about forty lines, and for the rename it printed: chat completions, request, max tokens, removed, clients still send it. And you'd run it in C I, against the spec on main. For real projects there's a proper tool called O A S diff. But writing a small one yourself is how you learn what it's checking. Then revert the rename, and ask an agent to review both guards. What breaking changes would they still miss?

A: And step seven is doing the change properly. Shaped like that one-core-two-adapters picture. Two thin routes. Version one accepts max tokens, exactly as before. Version two accepts max completion tokens, and because it's a fresh contract, it rejects unknown fields. In pydantic, that's a config setting that says extra fields are forbidden. So the next silent rename is impossible on version two. Both call the core, through the idempotency wrapper. Then the spec. Add the version two path, and mark the version one operation as deprecated. Open A P I has a flag for exactly that, and your generated docs will strike it through. And the spec diff still has to pass, because you added a path, you didn't change one.

A: Then deprecation headers on every version one response, including errors. Deprecation, as that at sign and Unix seconds. Sunset, as an H T T P date, and Python's standard email utilities can format one for you. And check that the sunset isn't earlier than the deprecation. The standard says it must not be. Then, know who's left. Log one line per request with the key name and the version. And write a ten-line script that reads the log and prints version one request counts per key, over the last day. That's the list you'd email. Then migrate the client. Change bench dot pi to call version two, with max completion tokens. And make it print a warning any time a response carries a Deprecation header. Rerun its consumer contract against version two. Run the per-key script again, and your key drops off the version one list. And then, sunset. Set the sunset date to yesterday. Version one now returns four ten, with the code "version retired," and a message naming version two.

B: But you keep the route around?

A: You keep the route. The four ten is the documentation for anyone who shows up late. And then the last move. You swap the fake core for the real one. Generate calls into the logic from your Spark server, under its GPU lock. And the A P I layer doesn't change at all. Not one line. That's how you know the layering's right. And you're done when the whole thing hangs together. The spec lints, the docs build, version one shows as deprecated. Every error your server can return, bad JSON, missing field, bad key, rate limit, idempotency conflict, four oh four, four oh five, a crash, comes out in the one shape, and the SDK raises the matching exception for each. A slow model with a fast-timeout client runs once with a key, several times without. Reusing a key with a different body gets four twenty-two, and Alice can't replay Bob. The rename fails both guards, version two passes both. And bench runs on version two with no warnings.

<!-- section: Measure -->

A: So the numbers. These are from the fake core on an M-series Mac, all on localhost. Your milliseconds will differ, but the shape should match. The retry experiment first. No idempotency key, one-second timeout, two retries, two-second model. Three generations, and the client got a timeout error after about four point three seconds. Same thing with a key, and four retries: one generation, and the client got a replayed two hundred after about two and a half seconds.

B: So with the key, the client actually got an answer. Even with more retries.

A: It got the answer, and the GPU did a third of the work. Then the error shape. Empty messages with FastAPI's default handler, Unprocessable Entity Error, four twenty-two. With yours, Bad Request Error, four hundred, param is messages. Broken JSON with no key, four twenty-two, because the body gets parsed before auth. And after the rename in step six, bench dot pi asked for two hundred fifty-six tokens and got sixteen.

B: [skeptical] Okay, but here's my worry with all of this. You've stacked up, what, auth, a rate limiter, validation, a database write for idempotency, a log line... in front of every request. That's got to slow the server down.

A: It's the right thing to worry about. So, here's the actual number. The median request through auth plus the token bucket, with the fake model sleeping zero seconds, so you're only measuring the A P I layer, was about one point four milliseconds. Add an idempotency key, which means one S Q Lite insert and one update, and it's about two milliseconds. Rough numbers, from a few dozen requests in a row on a Mac. Now put that next to a real request. A two fifty-six token request on the Spark spent about twenty seconds on the GPU in the Fireworks lesson. Twenty seconds is twenty thousand milliseconds. So two milliseconds out of twenty thousand is one ten-thousandth of the request.

B: [quietly] Oh. That's nothing.

A: It's nothing. It's like worrying about the time it takes to open your front door on a two-hour drive. So you never skip auth or validation or idempotency "for speed" on an inference server. The thing that costs is the GPU. And the whole job of the A P I layer is to stop wasted GPU work. Duplicate retries, invalid requests, callers who are over budget. And the retry row is the one to remember. Without a key, the client got nothing, and the server did three requests' worth of work. On your real server with the GPU lock, those three would queue. So every other user's time to first token, how long until they see the first word of their answer, would grow by two full generations.

<!-- section: Break It -->

A: Then you break it, four ways. First, take away the strictness on version two. Remove that "extra fields forbidden" setting and send max tokens to version two. The request succeeds, with the default limit. Your exact bug, back again.

B: [skeptical] Hang on, though. Earlier you said clients should be tolerant readers. Ignore what you don't know. Now you're saying ignoring is the bug?

A: [thinking out loud] Yeah, and, I mean, both are true. It depends which side you're on. Being tolerant when you're reading a response is great for a client. Extra fields can't hurt it. But for a server, silently ignoring a field the client clearly meant to send is how renames become invisible. The client said max tokens. It meant it. Dropping that on the floor isn't tolerance, it's losing their instruction. So, strict on new contracts, and tolerant only where you've actually promised to be.

A: Second. Make the idempotency keys global. Drop the owner from the primary key. Then have two users, Alice and Bob, both send idempotency key one. Which people really do, they use counters. And Bob gets Alice's completion. On a real service that means Bob is reading Alice's data. With the body hash in place, he gets a four twenty-two instead, unless their bodies happen to match exactly. And the lesson generalises. Any cache keyed by something the client chooses also has to be keyed by who the client is.

A: Third. Streaming with an idempotency key. Send a streaming request with a key, kill the client halfway through, and retry. What should the server replay? The events it sent so far? All of them, once it's finished? Neither answer's obvious. Which is why many APIs only honour idempotency on non-streaming requests, or document something very specific. So write down what yours does. And if the answer is "it generates again," say that in the spec.

A: Fourth. Put the rate limiter before auth. Move the bucket to run first, and since you don't know who anyone is yet, you key it by IP address. And now everyone behind one shared address shares a bucket. That's NAT, network address translation, where a whole office, or everyone using a Tailscale exit node, goes out to the internet looking like one IP. So one heavy user throttles the whole office. And worse, a stranger sending garbage keys spends your real users' budget.

B: But you do want something in front of auth, though. Otherwise someone can just hammer you guessing keys.

A: You do, and that's the fix most APIs use. Two limiters. A coarse one per IP, in front of auth, that's just there to stop key guessing. And the real one, per key, after it.

<!-- section: Scaling -->

B: Okay, so, all of this is one server, three clients. What happens when it's a real product? Thousands of clients, a bunch of servers?

A: Say three thousand clients across twenty servers behind a load balancer. The ideas all stay the same. What changes is where the state lives. Right now your key table, your token buckets, and your idempotency store all live inside one process, or in one S Q Lite file on one machine. With twenty servers, a retry can land on a different server than the original request did. So that server's never heard of the key, and runs the model again. So the idempotency store has to be shared, in something like Redis or Postgres. And the claim still has to be one atomic step there. In Redis that's a set-if-not-exists with an expiry. In Postgres, a unique constraint. Same idea as your insert-or-do-nothing.

B: And the rate limits?

A: Same problem. If every server keeps its own bucket, each key effectively gets twenty times its limit. One bucket per server, twenty servers. So the buckets have to be shared too, and the rate limits lesson covers the distributed version. And key lookups happen on every single request, so those get cached. Then the idempotency store's size, which is worth actually working out. It's requests per day, times how long you keep them, times the size of a response. So, three thousand clients, each doing ten thousand requests a day. That's thirty million requests a day. Keep them for twenty-four hours, so thirty million rows at any moment. And say each saved response is about two kilobytes. Thirty million times two kilobytes is sixty million kilobytes. About sixty gigabytes.

B: [surprised] Sixty gigs just to remember answers in case someone retries.

A: Right, which is why you'd keep them for less time, or store a hash and a pointer instead of every full response body. And at that size, deprecation turns into a real project. You need per-version, per-key usage just to find out who's left. Windows of months, with brownouts. Because now the long tail isn't one forgotten cron job. It's hundreds of clients.

<!-- section: Close -->

A: If you want to go further, the two best things to read are Fielding's dissertation, chapter five, for why REST is about independent evolution, and Brandur Leach's two posts on Stripe's blog, one on versioning and one on idempotency.

B: [working it out] Okay, let me try the interview answer. An API lifecycle is the life of the API as a product. You design the contract first, build and document and test against it, release it, watch who's using what. And then when you need to change something, you version it, deprecate the old version, and eventually turn it off. And separately, there's the life of one request through the server, auth, rate limit, validation, handler. And the main thing to watch is breaking changes, like renaming a field.

A: [gently] That's most of it, and the shape's right. Two things I'd sharpen, though. First, the two lifecycles aren't separate. They're the same promise at two zoom levels. The design stage decides the rules, and the request pipeline is where those rules get enforced, on every single call. Second, breaking isn't about what you changed, like a rename. It's about what some client was relying on. A changed default breaks people. A new enum value breaks people. And the worst ones, like yours, don't fail at all. They just quietly give the wrong answer, to a client you can't see, and can't redeploy.
