<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture a morning. Your Spark is serving Llama to an agent harness one of your teammates wrote. And there's a message waiting for you. "Hey, the agent sometimes stalls for a second or so before it starts answering. Not always. Started last night, maybe?"

B: Okay. So I'd try it.

A: You try it. You send five requests by hand. All five are fast. So then you go look at the server's terminal, and it's tens of thousands of lines that say "got request" and "done". And there's no way to tell which "done" goes with which "got request", or which ones were slow.

B: [a bit unsure] Then I'd go read the code. If something's slow, it's in there somewhere.

A: That's what almost everybody does. And you read it, and it looks exactly like it did last week. Because it is exactly the same code. That's the whole problem in one moment. The code is the same for every request. The behavior isn't.

B: Huh. Yeah, okay. Same file, different night.

A: Right. So what changed? Everything around the code. Maybe one customer started sending prompts full of code blocks. Maybe a batch job now runs at two in the morning. Maybe one database machine is sick. Maybe two requests grab the same lock at the same moment. None of that lives in the source file. It only exists in the running system, and the running system forgets all of it the instant it happens. Unless you made it write things down.

B: So it's a diary, basically. The program keeps a diary.

A: That's a good way to put it. And making it write the right things down, in a form you can search and add up later, has a name. Observability. How well you can figure out what a running system is doing, and why, from the outside, using only what it reports about itself.

<!-- section: Who made this search slow -->

A: [warm] And the story of where this came from is kind of perfect. Google, in the two thousands. One web search doesn't hit one machine. It fans out to thousands of them, across dozens of services. Spelling, ads, images, news, each with their own backends.

B: And when a search got slow?

A: When a search got slow, every team opened their own dashboard, and every dashboard said, my service is fine. And they were all telling the truth, more or less. But nobody could see one request's path through the whole thing. So nobody could say where its time went.

B: [laughs] Everyone's green and the user is still waiting.

A: Everyone's green. So their fix was really simple to say. When a request comes in the front door, give it an ID. Pass that ID along on every single internal call. And every service writes down little timed segments of its work, tagged with that ID. Then something collects them all and stitches them back into a tree. That system was called Dapper.

B: Doesn't that cost a fortune, though? Writing all that for every search?

A: It would. So they didn't do it for every search. They recorded about one request in a thousand. And that was still plenty to find the slow service. That idea spread, through a couple of open-source projects, and eventually became a standard called OpenTelemetry, which is what you'd actually use today.

<!-- section: Three ways to write things down -->

A: So here's the picture I keep in my head. A busy restaurant. Table twelve waited forty minutes. How do you find out why?

B: Ask the waiter.

A: [amused] The waiter doesn't remember. Busy night. So there are three ways the restaurant could have written things down. One is the order slips. Every event gets a slip as it happens. Table twelve ordered. Grill fired table twelve. Super detailed, you can read any one of them. But a busy night makes thousands, and if you want to know "were we slow tonight", you'd have to read them all.

B: Okay.

A: Second is a tally board. A few numbers kept running all night. Orders taken, orders sent back, how many tickets are on the rail right now, how long dishes took, roughly. It's tiny and cheap, and it's great for "are we slow?" But it's useless for "why was table twelve slow", because the board doesn't remember tables.

B: And the third?

A: The third is following one ticket. You stamp the time on it at every station it passes. Waiter, grill, plating, out the door. And for that one order you can see, oh, most of the forty minutes it was just sitting on the grill rail.

B: So those are, what, logs, metrics, and traces?

A: That's them. The slips are logs. The tally board is metrics. Following one ticket is a trace. And the reason you want all three is that each one is cheap exactly where another one is expensive. And they're tied together by one shared thing, which is that ID.

<!-- section: Logs that you can actually use -->

B: I mean, I already have logs. I print stuff.

A: You have logs. A print that says "done" is a log. It's just a bad one. A few changes make it something you can debug with. First, write each event as data, not a sentence. Fields you can filter on. How long it took, which user, how long the prompt was. People call that a structured log.

B: So I can say "show me everything slower than a second".

A: Right. And second, the big one. Stamp a request ID on every line. Your server is handling a bunch of requests at once, so their lines are all shuffled together. Without an ID, you can't tell which lines belong to which request. With one, your teammate says "request such-and-such was slow" and you pull up every line it ever wrote.

B: And I'd have to pass that ID through every function?

A: You don't, actually, which is the nice part. Python has a way to keep a value that's private to the current request, even when lots of requests are running at once. You set it once when the request arrives, and the logger picks it up on every line. It's like a global, but each request sees its own.

B: Okay, that's clean.

A: And then there's the cost, which is the thing nobody tells you. On your one server you can keep everything. But at real scale, logs are a storage bill. Stores charge by how much you send them, and a big service writes a frightening amount every day. So big systems keep every error, keep every slow request, and keep just a small sample of the boring ones.

<!-- section: Metrics, and the explosion -->

A: Metrics are the opposite trade. A metric throws away the details on purpose. It doesn't remember any one request. It's just, how many came in, how many failed, how long they took, kept as running counts. And because it's so small, you can keep it forever and add it up across every machine you own.

B: That sounds like where I'd put everything I care about.

A: [skeptical] Careful. There's a trap. You can split a metric by some tag. Like, requests that succeeded versus requests that failed. Each combination of tags becomes its own separate stream of numbers, stored on its own. And that's fine when the tags come from a small, fixed set. Status, endpoint, which model.

B: [working it out] But someone's going to say, let's tag it by user, so we can see each user's latency.

A: Someone always says that. And now every user is a separate stream. With a lot of users that's millions of streams, and your monitoring system runs out of memory. Usually the day traffic grows, so it happens quietly, at the worst possible time. It's called a cardinality explosion, which just means too many different values. It's one of the most common ways people take down their own monitoring.

B: So where does the per-user stuff go?

A: Into the logs and the traces. They're stored one event at a time, so they're built for it. Metrics get the small fixed tags. Anything that can grow without limit goes in the other two.

<!-- section: The average lies -->

B: Okay so, I'd build a dashboard. Average latency over time. If it goes up, something's wrong.

A: That's the dashboard most people build first. And here's what happens. I planted a fault in a stand-in server, where about five percent of requests got an extra delay. A big delay, almost half a second. And then I watched the average.

B: And it went up.

A: It went up a little. Barely. The kind of wiggle you'd call noise and scroll past. Because the average takes the pain of those few unlucky requests and spreads it over everybody. But the slowest one percent, what people call the p ninety-nine, jumped way up. Because now the slowest one percent of requests are all sitting inside that slow five percent.

B: Right, which is the whole point of tail latency. The users who hit it feel all of it.

A: They feel all of it. And there's a second trap that's sneakier. Say you've got four servers and you want the p ninety-nine for the whole fleet. The obvious move is to take each server's p ninety-nine and average them.

B: [a bit unsure] Is that wrong? That seems like what I'd do.

A: It's wrong, and it's wrong in the bad direction. One sick server out of four, and averaging the four tails tells you things are much better than they really are. Percentiles just don't add up. Counts do. So the way metrics systems handle it is, each server keeps a count of how many requests landed in each latency range. Under a tenth of a second, under a quarter, and so on. You add those counts across every server first, and then you work out the percentile once, from the total.

B: Add the counts, then estimate. Never average the answers.

A: That's the rule. And it's the same rule as with tail latency, just in the language your dashboards speak.

<!-- section: Following one ticket -->

A: So the metric says the tail got worse. But it can't tell you why, because it's forgotten every individual request. That's where the trace comes in. It keeps one request whole.

B: As the ticket with all the timestamps.

A: Right. A trace is a tree of timed steps. Each step is called a span. One span for the whole request, and inside it, smaller spans. Checking the user's quota. Tokenizing. Waiting for the GPU. Reading the prompt. Writing the answer. And if you draw it on a timeline, it looks like a waterfall, each step a bar under its parent.

B: And when something's slow, one bar is fat.

A: One bar is fat. And what I love is the faults that only a trace can see. Say the quota check is in a gateway in front of your server, and its database gets slow. Your server's own metrics are perfect. Every request it sees is fast. It just doesn't see the time users spent waiting before it got called. Only the trace, which measures the whole request, shows it.

B: [skeptical] Okay, but couldn't I just run a profiler? See which code is hot?

A: For some things, yes. But here's the other one I planted. A shared cache with a lock around it. And every so often, the code holding the lock does something slow, and everybody else waits. The span for that cache lookup does almost no work. Microseconds of actual computing. But it lasts a long time, because it's waiting. A normal profiler looks at what's running, and a waiting thread isn't running. So the profiler says that code is idle, and the trace says that's your problem.

B: Huh. Idle and guilty at the same time.

A: [laughs] Pretty much. And to make a trace cross from one program to another, the ID just rides along in a header on the request. The caller adds it, the next service reads it and says, my work is a child of yours. If any service in the middle forgets to pass it on, the trace snaps into pieces, and you get a hole in the middle of every request.

<!-- section: Who wakes you at three in the morning -->

B: Okay, so I've got all three. But at three in the morning, nobody's looking at any of it.

A: Nobody's looking. So something has to decide when to wake someone up. And the way the Google reliability people framed it is, first you write down a target, in terms of what users feel. Like, ninety-nine percent of requests should get their first token within a quarter of a second, over a month. That's called an SLO, a service level objective.

B: Why not a hundred percent?

A: Because the last little bit is wildly expensive, users can't tell the difference through their own flaky wifi, and a team that's never allowed to break anything never ships anything. So the one percent left over becomes a budget. The error budget. You get to spend it on deploys and experiments and the occasional bad night.

B: And then I'd alert when the budget's running low?

A: You alert on how fast you're spending it. That's the burn rate. If you're spending it evenly, it lasts the whole month. If something's making a few times more requests miss than you're allowed, the month's budget is gone in a week. Spend it really fast and that's worth a page. Spend it slowly and that's a ticket for the morning.

B: [working it out] But honestly, I'd probably just have an alert for high CPU. Or the GPU being pegged. That's the classic one.

A: That's the classic one, and it's the one to drop. Think about it. The GPU at full tilt on an inference server is the GPU doing its job. So that alert fires on a perfectly healthy night. And the slow database in the gateway? No CPU, no memory, nothing. That alert stays silent while users suffer.

B: So it's wrong both ways.

A: Wrong both ways. And every page that turns out not to matter teaches the person on call that pages don't matter. That's alert fatigue, and it's how real incidents get slept through. So the rule is, page on symptoms, things users feel. Errors, slowness, the budget burning. Causes like CPU belong on a dashboard, for the human who got woken up to look at next.

<!-- section: The hunt -->

A: The part I'd really do, the part that made it click for me, is the hunt. You run a stand-in server with a fault hidden in it, picked at random, and you're not allowed to read the code. Only what it wrote down. Dashboard first, to see the symptom. Traces next, to see which step is fat. Then the logs, to see what the slow requests have in common. Same user? Same kind of prompt?

B: And what surprised you?

A: Two things. Every fault I planted was nearly invisible on the average and obvious on the tail. Every single one. And when I worked out how fast each one was burning the budget, none of them deserved a three in the morning page. A small slice of slow requests is a real problem, but a slow one. A ticket, not an emergency. Which is exactly what you want the system to say.

<!-- section: Ending -->

B: Okay, let me try. You can't debug a live system by reading code, because the code's the same for every request. So you make it write things down three ways. Logs for the detail of one event, metrics for the counts across everything, and traces for where the time went in one request. Tie them together with an ID. And then you alert on the average getting worse.

A: Almost all of that. The one thing I'd change is the very end. Not the average, because the average is exactly what hides a problem that only hits a few people. You alert on what users feel, counted one request at a time. How many missed the target, and how fast you're burning the budget. Do that, and when the message comes in saying "it stalls sometimes", you can answer with which step, which requests, and since when.
