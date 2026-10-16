<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture this. Your Spark is serving Llama to an agent harness a teammate wrote. And one morning there's a message waiting for you. "The agent sometimes stalls for a second or so before it starts answering. Not always. Started last night, maybe?" That's it. That's the whole bug report.

B: [casual] Okay, so I'd try to reproduce it. Send it a few requests, see if one of them stalls.

A: Right, and you do. Five requests, by hand. All fast. Then you look at the benchmark harness from when you compared the Spark against Fireworks, and it says the median time to first token is fine. Time to first token being how long from sending the request until the first word of the answer comes back. So then you open the server's terminal and scroll. Forty thousand lines of "got request" and "done". And there's no way to tell which "done" belongs to which "got request". Or which ones were slow.

B: Then I'd read the code. Something must've changed.

A: And it looks exactly like it did last week. Because it is exactly the same code.

B: [skeptical] So... then where's the bug?

A: [warmly] That's kind of the whole lesson in one question. You can't debug production by reading code. The code is the same for every request, and the behavior isn't. What changed is everything around the code. The inputs, like, maybe one customer started sending prompts with code blocks in them. The load, maybe there's a batch job that runs at two in the morning now. The dependencies, maybe one database shard is sick. And the timing between requests, two of them grabbing the same lock at the same moment. None of that's in the source file. It only exists in the running system. And the running system forgets everything the instant it happens... unless you made it write things down.

B: [slowly] So the fix isn't finding the bug. It's, like, making the thing keep a diary.

A: Pretty much. Making it write the right things down, in a form you can search and add up later. That has a name: observability. How well you can figure out what a running system is doing, and why, from the outside, using only what it reports about itself. The word comes from control theory. And there are three classic ways of writing things down. Logs, metrics, and traces. By the end of this you'll have all three on your server, and you'll use them to find a fault when you don't know where it is.

<!-- section: Origin -->

A: And this problem has a really clean origin story. Google, in the two thousands. A single web search wasn't one program. It fanned out to thousands of machines, across dozens of services. Spelling, ads, images, news, each with its own backends. And when searches got slow, every team pulled up their own dashboard, and every dashboard said, "my service is fine".

B: [amused] Of course they did.

A: And the thing is, they were mostly telling the truth. Each service on its own looked okay. What nobody could see was one request's path through the whole system. So nobody could say where its time went. Google's answer is in a paper from twenty ten, called Dapper, by Ben Sigelman and his colleagues. The idea's almost embarrassingly simple. Give every request an ID at the front door, and pass that ID along on every internal call. Each service records little timed segments, they called them spans, tagged with that ID. And a collector stitches them back together into a tree. And to keep the cost tiny, they only recorded a sample. In the first version, about one request in every thousand and twenty-four.

B: One in a thousand? And that was enough to find anything?

A: [matter-of-fact] It was enough to find the slow service. Because if a service is slow, it's slow on lots of requests, so a one-in-a-thousand sample still catches plenty of them. And then Dapper had kids. Twitter built Zipkin in twenty twelve. Uber built Jaeger in twenty fifteen. Those led to two competing open standards, Open Tracing and Open Census, and in twenty nineteen they merged into one, OpenTelemetry. Which is what you'll actually use. Metrics have a parallel story. Google had an internal system called Borgmon, and it inspired Prometheus, which started at SoundCloud in twenty twelve.

<!-- section: The Idea: Three ways to write things down -->

A: So, the three ways. One quick comparison to hang them on. A busy restaurant, and you want to know why table twelve waited forty minutes. One way: the order slips. Every event written down as it happens. Seven oh two, table twelve ordered. Seven thirty-one, grill fired table twelve. Really detailed, you can read any single one. But a busy night makes thousands of them, and if the question is "were we slow tonight?", you'd have to read all of them. Second way: a tally board. A few numbers kept running all night. Orders taken, orders sent back, tickets on the rail right now, how long dishes took, sorted into rough buckets. Tiny. Cheap. Great for "are we slow?" And useless for "why was table twelve slow?", because the tally doesn't remember tables. Third way: you follow one ticket. Staple a timestamp to it at every station. Waiter, grill, plating, the pass. And for that one order you see exactly where the forty minutes went. Twenty-eight of them, it sat on the grill rail.

B: And those are logs, metrics, traces. In that order.

A: In that order. A log is a timestamped record of one event, written by the program as it happens. One line per event. "Request seven F three A finished in one point two seconds." It answers: what happened, in detail, for this one event? A metric is a number tracked over time, usually added up. A count of requests, the current queue length, a histogram of latencies. It's cheap because it doesn't keep anything per request. It answers: how much, how often, how fast, across everything, over time? And a trace is the full path of one request, recorded as a tree of timed steps, possibly across many processes and machines. It answers: where did the time go, inside this one request?

A: If you drew one slow request all three ways, side by side, it'd look like this. On the left, the log line. A little JSON record, with the request ID, seven F three A, the user, time to first token four hundred thirty-one milliseconds, total duration about a thousand and sixty-seven. All the detail, but no shape. In the middle, the metrics. That request is just plus one on the total-requests counter, and plus one in the one-and-a-half-second bucket of a latency histogram, next to a little gauge saying twelve requests are in flight. The shape of everything, no detail at all. And on the right, the trace. A stack of bars on a timeline. One bar for the whole request across the top, then underneath, a fat bar for a step called quota check, two tiny slivers for tokenize and cache, a small one for prefill, and a long one for decode. The shape of one request. And you can see at a glance which step ate the time.

B: [thinking out loud] So each one's blind exactly where another one can see.

A: Yeah. Each is cheap where another's expensive, which is why you want all three. And they're wired together by one shared thing. An ID.

<!-- section: The Idea: Logs -->

A: So, logs. A print statement that says "done" is a log. A bad one. Three upgrades turn it into something you can actually debug with. The first one is structure. Instead of writing a sentence, you write each event as one JSON object per line. So "request done in one thousand sixty-seven milliseconds for user oh four one two" is readable, sure, but all you can do with it is search for text. Whereas a JSON line with a field for the message, a field for the duration, a field for the user... that you can filter. Duration over a thousand. You can group it, by user. You can count it. With J Q on your laptop, which is a little command-line tool for slicing JSON, or with a log store at work. That's called a structured log. Fields a machine can read, instead of free text.

A: The second upgrade is a request ID on every line. Your server's handling, say, sixteen requests at once. Their log lines come out interleaved, all shuffled together. Without an ID you can't tell which lines belong to which request. So when a request arrives, you generate an ID. Or if the caller already sent one, in a header usually called X request I D, you use theirs. Then you stash it somewhere every function can reach, and the log formatter stamps it on every line automatically.

B: [a bit unsure] Why not just pass it along as an argument? Or, I don't know, put it in a global?

A: Passing it by hand means every function in the call chain needs an extra parameter, including ones in libraries you don't own. And a global is just wrong here. You've got sixteen requests in flight on one event loop, they'd all be overwriting the same variable. So in async Python you use a context var. It's from Python's context vars module, and it's a variable whose value is private to the current task, or the current thread. So sixteen concurrent requests each see their own value. It's basically the async-safe version of a global. And then you send the same ID back to the caller in a response header. So when your teammate says "request seven F three A was slow", you can find every single line it wrote.

A: Third upgrade, levels. Each line gets a severity. Debug, which is chatter for developers. Info, normal events worth keeping. Warning, something odd that recovered. Error, a request actually failed. In production you usually keep info and above.

A: [more serious] And then there's the cost. Which is the thing nobody tells you. Say you serve a thousand requests a second. Ten log lines per request, five hundred bytes per line. So that's ten thousand lines a second, times five hundred bytes, five megabytes every second. Sounds small. Multiply by the seconds in a day and it's about four hundred thirty-two gigabytes. A day.

B: [surprised] From log lines?

A: From log lines. And log stores charge by the gigabyte you send them and the gigabyte you keep. So big systems sample. They keep every error and every slow request, and maybe one percent of the boring successful ones. On your one server, keep everything. Your company can't. And there's a time cost too. Formatting one JSON log line in Python took about four microseconds on a Mac, writing to memory, Python three fourteen. Next to a five-hundred-millisecond request, that's nothing, more than a hundred thousand times smaller. But inside a loop that runs once per generated token? That starts to add up.

<!-- section: The Idea: Metrics -->

A: Metrics are the opposite bet. A metric throws away the details on purpose, so it can be kept forever and added up across machines. And there are three kinds. I'll use Prometheus's names, since Prometheus is the standard open-source metrics system. The first is a counter. A number that only goes up. Total requests served, total errors, total tokens generated.

B: [working it out] So the counter is how many requests you've had. You look at it and it says, like, two million.

A: [laughs] You could, but that number's almost meaningless. It resets to zero every time the process restarts, and two million since when? What you actually care about is how fast it's climbing. Its rate. "Requests per second over the last minute" is the slope of the counter. So you never really look at a counter, you look at how steep it is.

A: Second kind, a gauge. A number that goes up and down, and you read it as-is. Requests in flight right now. Queue length. Memory in use. What fraction of the K V cache is full. Third kind, a histogram. And you met this idea before, when you did tail latency. Back there it was the H D R histogram, where instead of keeping every latency you just keep counts in a bunch of ranges. A Prometheus histogram is the same idea with buckets you choose yourself. It's a set of counters, one per latency range, plus a total count and a total sum. Every time a request finishes, you bump the counter for the bucket it fell in. And the percentiles get estimated later, from the counts.

A: Now, one detail about Prometheus buckets that trips everyone up the first time. They're cumulative. Each bucket counts everything less than or equal to its upper edge. Here's what a stand-in server printed for its end-to-end latency after three hundred requests. The bucket for a quarter of a second said zero. The bucket for half a second said a hundred and two. The bucket for three quarters of a second said two hundred ninety-eight. And the one-second bucket said three hundred, and every bucket after that also says three hundred.

B: So two hundred ninety-eight requests landed between half a second and three quarters?

A: [gently] No, that's the trap. Two hundred ninety-eight took three quarters of a second or less. That includes the hundred and two that were under half a second. So the ones between half and three quarters are the difference, a hundred ninety-six. The counts only ever grow as you go up the buckets, and the last bucket, the one labelled plus infinity, always equals the total. Then there's the sum. All three hundred together took about a hundred sixty-seven and a half seconds, so the mean was about five hundred fifty-nine milliseconds. And that's the whole histogram. A dozen numbers, no matter how many requests it's seen. Three hundred or three billion. Recording one observation took about four tenths of a microsecond.

A: So which metrics do you actually keep? Two recipes cover almost everything. For things that serve requests, there's the RED method, from Tom Wilkie. Rate, errors, duration. How many requests a second, how many fail, and a latency histogram. That's what your users feel. For resources, things like the CPU, memory, a disk, the GPU, a lock, a queue, there's the USE method, from Brendan Gregg. Utilization, saturation, errors. Utilization is how busy it is. Saturation is how much work is waiting for it. On your server, that's GPU utilization, and saturation is the line of requests waiting for the GPU lock. And if you've seen Google's "four golden signals", latency, traffic, errors and saturation, that's the same thing. The two recipes merged.

<!-- section: The Idea: Labels and the explosion -->

A: Metrics get dimensions through labels. A label is a key-value tag on a metric. So the requests counter with status equals ok, and the requests counter with status equals error, those are two separate counters. Two separate time series. A time series being one stream of timestamp-and-value points, for one metric, with one exact set of label values. And that's the unit Prometheus stores, and indexes, and spends memory on.

B: Okay, so then here's what I'd want. Per-user latency. Put the user ID on the latency histogram as a label, and I can see which user's having a bad time.

A: [amused] And that is exactly how people take down their own monitoring. Do the multiplication with me. One histogram, twelve buckets. Label it by endpoint, say five of those, and by status, three of those. Twelve times five times three, a hundred eighty series. Totally fine. Now add user ID, with a hundred thousand users. Every one of those hundred eighty gets multiplied by a hundred thousand. Eighteen million series.

B: [working it out] And each one costs... something.

A: Each active series costs Prometheus memory on the order of kilobytes. So eighteen million of them is tens of gigabytes. And the nasty part is it happens silently, the day traffic grows. Nobody changed anything. That's called a cardinality explosion. Cardinality just means how many distinct values there are. When a metric's label combinations blow up, it eats memory and slows every query. The classic culprits are user IDs, request IDs, full URLs, and raw prompts.

B: [disappointed] So per-user questions just... can't be answered?

A: They can, just not with metrics. The rule is: metric labels come from a small, fixed set. Status code, endpoint, model name, region. Anything unbounded, user ID, request ID, prompt text, goes in logs and in trace attributes, which are stored per event and built for exactly that. We'll get to trace attributes in a bit.

<!-- section: The Idea: Percentiles come from buckets -->

A: Now, the dashboard almost everybody builds first is a line for average latency. And it's a mistake. So try this. Your server's requests take about two hundred seventy milliseconds on average. You plant a fault: five percent of requests get an extra four hundred milliseconds. How much does the average move? And how much does the p ninety-nine move? P ninety-nine meaning the latency that ninety-nine percent of requests beat. The slowest one percent sits above it.

B: [a bit unsure] Hm. Well, some requests got four hundred slower, so... the average goes up a lot, maybe a hundred? And the p ninety-nine goes up by about the four hundred.

A: The second half's close. The first half's way off, and that's the whole point. The average moves by five percent of four hundred milliseconds. That's twenty milliseconds. About seven percent. On a dashboard that's noise, you'd scroll right past it. The p ninety-nine goes from roughly five hundred thirty to about seven hundred thirty. Two hundred milliseconds. Because the slowest one percent now sits inside the slow five percent. So it's not quite the full four hundred, but it jumps. And on the stand-in server under real load it was the same story. Mean went up thirty-one milliseconds. P ninety-nine went up three hundred twenty-six.

B: So the people who hit the fault get four hundred extra, and the average just smears that over everyone.

A: Smears it over everybody and hides it. There's a little interactive chart that makes this really physical. It's a latency histogram, a hump of normal requests, with a dashed line for the mean and a blue line for the p ninety-nine. You get two sliders, how many requests are slow and how much extra delay. As you drag the slow fraction up, a second little hump grows off to the right. And the dashed mean line barely twitches. But the blue p ninety-nine line just leaps across into that slow hump. Then there's a toggle that switches it to a fleet of four servers with one sick one. Hold on to that, we'll come back to it.

A: Two things that chart teaches. First: percentiles are estimated from buckets. Prometheus has a function for it, histogram quantile. It finds which bucket the ninety-ninth-percentile request falls into, and then it just assumes the requests inside that bucket are spread out evenly. Which is fine if the bucket's narrow. If it's wide, the estimate drifts. Set five percent slow and a full second of extra delay, and the p ninety-nine lands in the bucket from one second to one and a quarter, and the estimate's off by almost a hundred milliseconds. So the rule is: put bucket edges where your decisions are. If your goal is "time to first token under two hundred fifty milliseconds", you want a bucket edge at exactly a quarter of a second. Then "how many were under two fifty" is an exact count. Not a guess.

A: Second thing: you can't average percentiles. That's the fleet toggle. The p ninety-nine of the whole fleet is not the average of each machine's p ninety-nine.

B: [skeptical] Why not, though? If I've got four servers, average the four, that seems like the honest summary.

A: So try it. Five percent slow, a full second extra, but only on one server out of four. The three healthy ones each report a normal p ninety-nine, the sick one reports a big one, and the average of those four numbers comes out about seven hundred thirty milliseconds. But if you pool every request from all four and actually find the slowest one percent, the true fleet p ninety-nine is about one point two seconds. The average under-reports by almost half a second.

B: [slowly] Huh. Because averaging the four throws away how many requests were slow on each one.

A: Right. A percentile depends on how many requests each server handled and on the shape of each one's tail, and four single numbers don't keep any of that. Counts, though, add up perfectly. And a Prometheus histogram is just counters. So the right way is: add the bucket counts across all the servers first, and estimate the percentile once, from the total. In Prom Q L, Prometheus's query language, that's the "sum by L E" pattern, L E being the bucket-edge label. The wrong way is computing a p ninety-nine per server and then averaging. It's the same rule you had for H D R histograms in tail latency, just in the language your dashboards speak. And Prometheus also has something called a summary, which computes percentiles inside each process. Those can't be added across machines at all. Which is why histograms are usually the better choice.

<!-- section: The Idea: Traces -->

A: So, a metric told you p ninety-nine got worse. It can't tell you why, because it's forgotten every individual request. A trace keeps one request whole. A trace is a tree of spans. A span is one timed step: it has a name, a start time, a duration, a parent, and some key-value attributes. "Tokenize took two milliseconds." "Database query took four hundred." The top span, the one with no parent, is called the root span, and it usually covers the whole request, as the first service saw it. Each step inside it is a child span, steps inside those are grandchildren. Every span records who its parent is, and every span in the tree shares one trace ID, which is a random hundred-twenty-eight-bit number. That's how the collector knows which spans belong together.

A: Drawn on a timeline, a trace looks like a waterfall. So picture one streaming request to an inference server. Top row, a bar for the gateway, the thing in front, stretching the whole width. Indented under it, a short bar for quota check, a database lookup asking "is this user over their limit?" Then the request hops over HTTP to the server, and under that, indented again: tokenize, a sliver. Cache lookup, a sliver. Queue wait, waiting for a free GPU slot, short. Prefill, processing the prompt, about ninety milliseconds. Then decode, thirty-two tokens at twenty milliseconds each, the longest bar by far. And there's a dashed vertical line where the first token goes out. Everything left of that line is time to first token.

B: So healthy, decode is most of it.

A: Decode is most of it. And then the chart lets you plant faults, one at a time, and watch which bar grows. Slow database: the quota check bar stretches by four hundred milliseconds. And here's the thing. That happens in the gateway, before the server is even called. The server's own metrics would be perfect. Its spans start late, but each one is normal. Users suffer, and the server's dashboard is green. Only something measuring the whole request, the root span, or the gateway's own metrics, can see it.

A: Cache lock: the cache lookup bar grows by three hundred milliseconds. But the actual work in that step is microseconds. It's waiting, for a lock some other request is holding. A CPU profiler would look at that code and say it's idle. The trace says it's the problem. Tokenizer: the tokenize bar grows by about a quarter second, but only on some requests. And there the question becomes, what do those requests have in common? GPU queue: the queue wait bar grows by nearly a second, but on every request at once. Nothing's broken, the server's just overloaded. That's how you tell overloaded from broken. Everyone gets worse together, versus a few get much worse.

A: And the last one. Slow decode. Every decode step goes from twenty milliseconds to thirty-four. The decode bar stretches out to the right. And the dashed first-token line? Doesn't move at all.

B: [surprised] Wait, so time to first token's fine, but...

A: But every answer takes about seventy percent longer. A dashboard that only watches time to first token says everything's great. You need the I T L for that one. Inter-token latency, the gap between one generated token and the next.

A: Now, spans also carry attributes. Key-value pairs on the span. The user, the prompt length, the model, the number of output tokens. And unlike metric labels, these can have as many different values as you like, because they're stored per span, not as separate series. So this is where the high-cardinality detail that's banned from metrics goes to live. Your per-user question from before? It's answered here. When you find the slow traces, their attributes tell you what they have in common.

<!-- section: The Idea: Context propagation -->

B: Okay, but you said the request hops from the gateway to the server. Those are two different processes. How does the server know its spans belong to the gateway's trace?

A: So inside one process, it's easy. The tracing library keeps track of "the current span" in a context var, the same trick as the request ID. Start a new span and it automatically becomes a child of whatever's current. But across processes there's no shared memory. So the parent has to travel with the request. That's called context propagation. Passing the trace ID and the current span ID from one service to the next, inside the request itself. And on HTTP it's one header, defined by a W three C standard called Trace Context. The header's called trace parent.

A: The header's a string with four pieces separated by dashes. The first is a version, two digits, zero zero. The second is the trace ID, sixteen bytes, written out as a long run of hex. That part is the same everywhere, on every service this request touches. The third is the parent span ID, eight bytes, the span that made this call. And the last is flags, and zero one means "sampled". So the gateway injects that header into its outgoing request. The server extracts it, and makes its own first span a child of the gateway's span. Same trace ID on both sides. And here's the bit that's easy to miss: each service ships its own spans to the collector separately. They never send spans to each other. The collector groups everything by trace ID and uses the parent IDs to rebuild the tree.

B: So if one service in the middle doesn't pass the header on...

A: Then the trace breaks into pieces. Everything after it starts a brand new trace with nothing joining it to the first half. And that last field, the flags, carries the sampling decision. That's head sampling. You decide at the very start of the request whether to record it, say one in a hundred, and every service downstream reads the flag and agrees. So you never end up with half a trace. The alternative is tail sampling. You decide whether to keep a trace after it's finished, so you can keep every slow one and every broken one, and only a few of the fast boring ones. But that needs a collector that buffers all the spans of a trace until it completes. Oh, and one small thing. When the current Python SDK was run for this, it actually printed flags zero three, not zero one. The extra bit is a newer addition to Trace Context that marks the trace ID as random. Your version may differ.

<!-- section: The Idea: OpenTelemetry and the backends -->

A: So who produces all this? OpenTelemetry, people say O Tel. It's an open standard plus libraries for most languages, for producing traces, metrics and logs, and a wire format for shipping them, called O T L P. Which runs over G R P C on port four three one seven, or plain HTTP on four three one eight. You write against its API, there's a call like "start as current span", and an exporter ships the data to whatever backend you pick. Before O Tel, switching tracing vendors meant re-instrumenting every service. Now it means changing an endpoint.

A: And you'll run three backends. Picture your server as a box on the left. It keeps its counters in RAM, it serves them as plain text at a slash metrics URL, and it has a little span batcher in it. Up and to the right, Jaeger. The server pushes finished spans to Jaeger over O T L P, in batches. Jaeger stores traces, lets you search them, like "show me everything over one second", and draws the waterfall. Down and to the right, Prometheus. Here the arrow goes the other way. Prometheus pulls. Every five to fifteen seconds it visits slash metrics and records whatever numbers it finds. And next to it, Grafana, which draws dashboards by sending queries to Prometheus.

B: Why's one push and one pull? That seems... inconsistent.

A: [thinking out loud] It's a bit inconsistent, yeah. But pulling is pleasantly robust for metrics. Your app does nothing but keep some numbers in memory. If the server dies, Prometheus notices because the scrape fails, there's a built-in metric called up that drops to zero. And your app can never block because the monitoring system is slow, since it never talks to it. Recent FastAPI releases have started shipping optional built-in OpenTelemetry support, and there are auto-instrumentation packages for most frameworks. Use them at work. But today you write the spans by hand, so you know what those packages are doing.

<!-- section: The Idea: SLIs, SLOs and error budgets -->

A: Okay. Dashboards are for looking. At three in the morning nobody's looking. So something has to decide when to wake you up. The Google S R E book, S R E for site reliability engineering, starts with three terms. An S L I, a service level indicator, is a measurement of how users experience the service, as a ratio. Good events over all events. "The fraction of requests whose first token arrived within two hundred fifty milliseconds." An S L O, service level objective, is the target for it, over a window. "Ninety-nine percent of requests get their first token within two hundred fifty milliseconds, measured over thirty days." And the error budget is everything the S L O lets you get wrong. One minus the target. Here, one percent of requests. So if you serve a million requests a month, ten thousand of them can be slow and you've still met your goal.

B: [skeptical] Why would you aim for ninety-nine, though? Why not just say a hundred, everything should be fast?

A: Because the last nines are wildly expensive. Because users can't tell ninety-nine point nine nine percent from a hundred through their own flaky Wi-Fi. And because a team that's never allowed to break anything never ships anything. The budget turns "is it reliable enough?" from an argument into arithmetic. Budget left? Ship. Budget gone? Slow down and fix things.

A: And then there's the burn rate. That's how fast you're spending the budget, compared to spending it exactly evenly over the window. You take the fraction of requests that are bad right now, and divide it by the budget fraction. With a ninety-nine percent S L O the budget's one percent. So if one percent of requests are bad, burn rate one. You'll use exactly the whole budget by day thirty. If six percent are bad, that's six divided by one, burn rate six, and the budget's gone in thirty divided by six, five days.

A: Picture it as a chart. Budget remaining going down the side, from a hundred percent to zero, and days across the bottom, zero to thirty. Three straight lines all starting top left. Burn rate one is a gentle slope that reaches zero right at day thirty. Burn rate six drops much steeper and hits zero on day five. And burn rate fourteen point four is nearly vertical, gone in about two days. The S R E workbook suggests paging at fourteen point four sustained over an hour, which means two percent of the month's budget is gone in that hour. Or at six, sustained over six hours, which is five percent.

A: So try this one. Same S L O. A fault makes six percent of requests miss the two-fifty mark. What's the burn rate, how many days until the budget's gone, and would a dashboard of average time to first token have shown it?

B: Burn rate six, five days. And the average... yeah, I think it'd show. Six percent of requests getting slow is a lot.

A: [amused] First two, yes. Third, no. On the stand-in server, with exactly this kind of fault, the average time to first token went from forty-four milliseconds to sixty-nine. Still way under two hundred fifty. So an alert on "average time to first token above two fifty" would never fire. Not once. The S L O counts bad requests one by one, so it can't be fooled by all the good ones.

<!-- section: The Idea: Alert on symptoms, not causes -->

A: Which brings up the two kinds of alerts. A symptom is something users feel. Errors, slowness, the S L O burning. A cause is something you guess might lead to that. CPU at ninety percent, one replica down, a disk eighty percent full, GPU memory high.

B: [a bit unsure] I mean, my instinct would be to alert on the causes. GPU utilization, memory. That's kind of what I thought monitoring was. Catch it before users notice.

A: That's the instinct everyone starts with. But page on symptoms. Here's why. Cause alerts fire when nothing's wrong. The GPU at a hundred percent is the GPU doing its job. One replica down while the others absorb the load is fine. And they stay silent when something is wrong. The slow-database fault raises no CPU, no memory, nothing. So you get woken up for nothing, and you sleep through the real thing. And every page that turns out not to matter teaches whoever's on call that pages don't matter. That's alert fatigue. People get so many alerts that don't need action that they start ignoring them, or muting them, including the real ones. It's how real incidents get slept through. Rob Ewaschuk at Google had a rule of thumb for it: every page should be urgent, actionable, and about something users notice. Causes go on dashboards, for the human who got paged to look at next.

A: And burn rate is the symptom alert done well. "Fourteen point four over the last hour" means you'll lose two percent of the month's budget in that one hour, which is worth waking someone for. And you also require a short window, say five minutes, to be burning too. That way the alert stops as soon as the problem stops, instead of hanging around for an hour after it's fixed.

<!-- section: The Idea: The fourth pillar, profiles -->

A: There's one more signal. A trace tells you which span is slow. It doesn't tell you which line of code inside the span is burning the time. That's a profiler's job. A profiler measures where a program spends its time, by function and by line. The common kind is a sampling profiler. It peeks at the call stack many times a second and counts what it sees. You used one already, py spy, when you dug into why Python is slow. The production version is continuous profiling. A sampler that runs all the time, at a low rate, on every machine, and saves the results, so after the fact you can ask, "what was this service doing at three twelve in the morning?" Google described doing that across their whole fleet in twenty ten, Google-Wide Profiling. Open-source tools like Pyroscope and Parca do it today. And OpenTelemetry is adding profiles as a fourth signal.

B: And that would've caught the cache lock thing?

A: [thinking out loud] Not a normal one, actually. That's the subtle part. A normal CPU profile only counts threads that are running. A thread that's stuck waiting for a lock isn't running. So it's invisible. You'd stare at the profile and see nothing. You need a wall-clock profile, one that samples every thread whether it's running or waiting, so time spent blocked on locks, or disk, or sleep, shows up. Py spy has an idle flag that does that. Or there's py spy dump, which just prints every thread's current stack right now, waiting or not. Take a few of those during load and you'll see where threads are sitting.

<!-- section: The Idea: Observing an LLM server -->

A: Everything so far applies to any server. An LLM server just has a few numbers of its own. Time to first token, as a histogram. That's what chat users feel, and it covers the time waiting in the queue plus the prefill, the pass over the prompt. Then I T L, the time per output token, as a histogram. That's decode speed, and it catches the slowdowns time to first token misses, like the slow decode fault. Output tokens per second, which you get as the rate of a token counter. That's your throughput, what you'd bill for. Prompt and output token counters, which are your cost, and the input to every capacity estimate. Gauges for requests running and requests waiting. That's saturation. If waiting stays above zero for a long time, you need more capacity. K V cache utilization, as a gauge, the fraction of the K V cache memory in use. Near a hundred percent, the engine stops letting new requests in, or it kicks some out. That's the continuous batching story. And prefix cache hit rate, from a pair of counters, which tells you whether prefix caching is actually paying off.

A: And V L L M and S G Lang already expose most of these on a slash metrics endpoint, in Prometheus format. The names change between versions, though, so don't trust a blog post. Just curl it and look.

B: What about agents? That's most of what I'd be running on it.

A: For agents, the trace is the natural unit. One agent run is one trace. Each model call is a span, each tool call is a span, with attributes for the model, input and output tokens, the tool name, whether it errored. And then the waterfall answers questions that are otherwise miserable. "Why did this run take four minutes?" Oh, eleven tool calls, one after another, and one of them was a ninety-second web fetch. "Where do the tokens go?" The whole context, re-sent on every single step. OpenTelemetry has draft conventions for these attribute names, they all start with gen A I. And honestly, most LLM tracing products are this idea with a nice UI.

<!-- section: Build It: Setup -->

A: So here's the build. You instrument a stand-in server, with the same shape as your naive server on the Spark. A FastAPI app, streaming the answer back as server-sent events, with a limit on how much "GPU" work can run at once, and prefill then decode. But it fakes the model with sleeps. So it runs anywhere and the numbers repeat. Four batch slots stand in for the GPU. Prefill costs four hundred microseconds per prompt token, and each output token costs twenty milliseconds, so fifty tokens a second.

A: Then there's a file of fake dependencies. A quota check, a tokenizer, a prefix cache. And it has a secret. At startup it picks one of three faults, based on a seed number, and each fault hits roughly five percent of requests. The file's folded away in the lesson because it's a spoiler. The whole point is to find the fault from the outside. Best move is to ask an agent to copy it into your folder for you, so you never see it. And even if you do peek, you won't know which of the three is switched on.

A: The load generator is open-loop. That's from tail latency. It sends requests at a fixed rate whether or not the server's keeping up, like real users do. As opposed to waiting politely for each answer before sending the next, which hides exactly the slowness you're trying to see. It pretends to be five hundred users, with a mix of prompts. Mostly a summarize-this-page prompt, some ranking prompts, a few with code blocks, some short haikus.

B: [working it out] Four slots, and each request takes... prefill plus decode, about half a second?

A: About fifty-five hundredths of a second, yeah.

B: So four slots divided by about half a second, the server tops out around seven a second.

A: Right around seven. So you keep the load at about five a second. Past seven, the queue just grows without bound. Try ten once, just to watch it happen. Then three containers, Jaeger, Prometheus and Grafana, from one compose file. That part's pure setup. The image versions move, so pin them once it works, and an agent can debug it freely. Prometheus will show your server as "down" until you add the metrics endpoint, which is the next part.

<!-- section: Build It: Logs, metrics, traces -->

A: Logs first. Every log line becomes one JSON object carrying the request ID, without passing the ID through every function by hand. So you write a small formatter that turns a log record into one JSON line. Timestamp, level, message, request ID, plus any extra fields. You take the ID from the incoming request header if there is one, otherwise you make one up. And here's the part that matters. You set the context var at the top of the streaming generator, the function that actually produces the events. Not only in the endpoint.

B: Why does that matter? Isn't the generator called from the endpoint?

A: It's created there, but it runs later, as its own step, after the endpoint has already returned the streaming response. So if you only set the ID in the endpoint, the generator might not see it. Then you send the ID back in a response header, and you log one "request done" line per request with the user, the prompt length, time to first token, total duration, output tokens and status. And you put that in a finally block, so failed and cancelled requests log too. One nice detail: when you hand the tokenizer off to a thread with to thread, Python copies the current context into that thread. So a log line written inside the tokenizer sees the right ID too. Then you check yourself with J Q. Filter for time to first token over two hundred, and you should see slow requests. Look for duplicate request IDs, and you should find none. One line per request.

A: Metrics next. A slash metrics endpoint, and a handful of metrics. A requests counter, labelled only by status, ok or error. Histograms for total duration, time to first token, and I T L, no labels. A gauge for requests in flight. Counters for prompt and output tokens. And a gauge for requests waiting for a GPU slot. The names are suggestions, the kinds are not. And you pick the buckets on purpose. The default buckets go from five milliseconds to ten seconds, generic. Your time-to-first-token S L O is going to be two hundred fifty milliseconds, so a quarter second has to be an edge. For I T L, with a twenty millisecond decode step, you want edges from about ten milliseconds to a hundred.

A: A few gotchas. The Python client tacks underscore total onto counter names when it prints them, so don't be confused when your output-tokens counter shows up with total on the end. The in-flight gauge goes up at the start of the generator and down in the finally. If it ever drifts upward under steady load, there's a path that skips the finally. A client disconnecting, say. And time the first token where you actually yield it, not where you start handling the request. Time to first token is from arrival to the first token going out. Then run some load, look at the time-to-first-token lines, and check the bucket counts only go up, and that the plus-infinity bucket equals the count.

A: Then traces. The SDK wiring is boilerplate, you take it as is. The spans are yours. A root span called chat, which starts from whatever trace context the caller sent. And inside it, one child span per step. Quota check, tokenize, cache lookup, queue wait, prefill, decode. Queue wait should cover only the wait for the semaphore, the thing guarding those four slots. So you acquire it inside that span, and release it later in a finally. You skip the neat one-line way of taking the slot, because that makes it awkward to time the wait on its own. On the root span you put attributes for the user, the request ID, the prompt length and the output tokens. Those are your clues later.

A: Then you make it cross a process boundary. The load generator gets its own tracer, with its own service name, wraps each request in a client-request span, and injects the trace parent header into the outgoing request. Open Jaeger, and you should see one trace with spans from two services. One more thing worth knowing. The batch span processor exports spans in a background thread. So a slow Jaeger, or a dead one, doesn't slow your requests down. Remember that, it comes back. And each span cost about eight microseconds on a Mac. Seven spans on a five-hundred-fifty-millisecond request is noise. A span per decoded token on a busy server... is not.

<!-- section: Build It: Dashboard -->

A: Then a dashboard in Grafana, built on RED. Rate, which is the sum of the per-second rate of the requests counter. Errors, as a fraction, the error rate divided by the total rate. Duration, p fifty and p ninety-nine, done the right way, summed buckets then estimate. Time to first token p fifty and p ninety-nine, plus the mean on the same panel. The mean is there on purpose, so you can watch it lie. Then I T L p ninety-nine, output tokens per second, and the two saturation gauges. Run five requests a second for ten minutes with no fault, and screenshot it. That's your healthy baseline. Then have an agent review your queries. The usual mistakes are averaging quantiles, using a rate window shorter than two scrapes, and forgetting to sum by the bucket edge.

<!-- section: Build It: The hunt -->

A: And then the actual fun part. The hunt. Start the server with a random seed, don't print it, and run ten minutes of load. Then find the fault. The rules: dashboards, Jaeger, J Q over the log file, curl on slash metrics, and py spy. No reading the dependencies file. No adding print statements.

B: [relaxed] Okay. Honestly, my first move would be to grep the log for the slow ones.

A: That's a good move, it's just step three. There's a method that works for any incident, not just this one. Four steps. One, the dashboard. What's the symptom? Which percentiles moved? Time to first token, or I T L? Is it all requests, or some? Did saturation change? Two, traces. Where does the time go? In Jaeger, search for traces with a minimum duration, say nine hundred milliseconds. Open five of them. Which span is fat in every single one? Three, attributes and logs. What do the slow ones have in common? Same user? Same prompt length? Or spread evenly over everybody? And J Q is your friend here. Group the slow requests by user and by prompt length, and compare that against all requests. Four, profile. But only if the span is fat and the code inside it is trivial. Run py spy dump against the server a few times during load, on a Mac you need sudo for that, and see where the threads are sitting.

B: [working it out] So it goes... the metric tells me something's wrong, the trace tells me where, and the logs tell me which requests and why.

A: That's the order, yeah. A metric alerts you, that's the symptom. Traces show you which step, that's the location. Logs and span attributes show you which requests and what they share, that's the cause. And the request ID, or trace ID, on all three, is what lets you jump from one to the next. Then profiles if you need the line of code. So you write a five-line incident note. The symptom, which span, which requests, your guess at the root cause, and the evidence. Then you check against the seed. And you repeat with new seeds until you've found all three faults.

<!-- section: Build It: SLO, and the Spark -->

A: After the hunt, you write the S L O down for real. Ninety-nine percent of requests get their first token within two hundred fifty milliseconds, over thirty days. The S L I in Prom Q L is the fraction of requests with time to first token above a quarter second, over the last five minutes. And to get that you need the count in the quarter-second bucket and the total count. Which is why that edge had to exist. Divide by the budget, one hundredth, and that's the burn rate. Put two panels up, burn rate over five minutes and over an hour. And write down the two alert conditions the S R E workbook suggests. The fast page: both the one-hour and the five-minute burn rate above fourteen point four. The slower one: the six-hour and the thirty-minute burn rate both above six. Then run each fault for ten minutes, and write down the burn rate, how many days of budget that leaves, and which alert would have paged. You don't build real alert routing. Just the conditions.

A: And last, you port it all to the real server on the Spark. The spans map directly. Queue wait is the wait for the GPU lock. Prefill ends when the streamer yields its first bit of text. Decode's the rest. For I T L, one catch: one streamed event can hold several tokens. So you record the gap between events divided by the tokens in it, or just each request's average. Add a gauge for requests waiting on the lock. Then run your benchmark harness with one request at a time, and then eight at a time, and watch queue wait turn into the biggest span in the whole trace.

B: [getting it] Because there's one GPU lock, and eight requests fighting over it.

A: Exactly that picture. And that's precisely what batching is about to fix. Then get an agent to review the diff, for spans that are never ended, and metrics with unbounded labels. So when you're done, you've got one JSON line per request with an ID matching the response, a metrics endpoint with deliberate buckets, traces from two services under one trace ID, a dashboard, all three faults found with a note each before you peeked, and a burn rate for each one.

<!-- section: Measure -->

A: So, numbers. You run each configuration at five requests a second for ten minutes. No fault, each of the three faults, and an overload run at eight a second. And you record the mean, p fifty, p ninety-nine, the time-to-first-token mean and p ninety-nine, the fraction of bad requests, the burn rate, and which span was the culprit. Here's what it looked like on a Mac with the stand-in, one minute per run, so three hundred requests. Which is thin for a p ninety-nine. It's basically the third-slowest request, so take those as rough.

A: Healthy: mean five hundred fifty-nine milliseconds, median five fifty-four, p ninety-nine about seven forty. Time to first token, mean forty-four milliseconds, p ninety-nine seventy-five. Zero bad requests. Then the three faults, deliberately not labelled which is which. The mean went up to somewhere between five seventy and five ninety. The median barely moved, it stayed in the high five hundreds. But the p ninety-nine jumped to around nine hundred, and in one case over a thousand sixty. And time-to-first-token p ninety-nine went from seventy-five to somewhere between about two eighty and four forty.

B: So the mean moved by... a few percent.

A: Two to six percent. And the median barely at all. Every one of those faults was nearly invisible on an average dashboard, and completely obvious on a p ninety-nine one. Time-to-first-token p ninety-nine moved four to six times. And the bad fraction came out at six percent, five point seven, and four point seven. So the burn rates were six, five point seven, and four point seven.

B: [a bit unsure] So that should page someone. Burn rate five, that sounds bad.

A: It's real, but it's slow. Burn rate five uses up a thirty-day budget in about six days. So it'd fire the slow alert, six times over six hours, or come close. Not the fast page at fourteen point four. And that's the right answer. It's a real problem, but a slow one. A ticket for the morning, not a three a m page. And it's no coincidence they're all about five, since each fault hurts about five percent of requests.

A: The overload run looks different from all three. Queue wait grows on every request. The in-flight gauge climbs. And the bad fraction doesn't sit flat, it keeps rising over the run. And then the cost of all this instrumentation. About four tenths of a microsecond per histogram observation, half a microsecond per labelled counter bump, eight microseconds per span, four per JSON log line. You can measure your own with a loop of a hundred thousand iterations. Against a request that takes five hundred fifty milliseconds, all of it rounds to zero.

<!-- section: Break It -->

A: And then you break it, four ways. First: put user on a metric label. Give the duration histogram a user label, run a minute of load, and count the lines on slash metrics. With five hundred users and about fifteen lines per histogram, you get several thousand lines, where there used to be a few dozen.

B: And that's five hundred users. On one server.

A: Now imagine a hundred thousand users and fifty servers, and what Prometheus's memory does. So you take it off the metric and put user on the span, where it belongs. Second: forget to extract the context. Drop the incoming trace context from the root span. Jaeger now shows two separate traces per request, one from the load generator and one from the server, with nothing joining them. And that's what a single service that doesn't pass the headers along does to a whole company's traces. A hole in the middle of every request.

A: Third, and this one's my favorite. Make the telemetry the outage. Swap the batch span processor for the simple one, which exports right away, synchronously, every time a span ends. And point the exporter at an address that never answers. Then watch your p ninety-nine—

B: [jumping in] Wait, why would that touch latency at all? The exporter's off to the side.

A: With the batch one it is, it's in a background thread. With the simple one, every span end now sits there waiting for a network timeout, inside the request. So your monitoring system being down makes your product slow. The lesson is, telemetry must never block the work, and its failure must not become your failure. Check how long your exporter's default timeout is, by the way. It varies by version.

A: Fourth: average the p ninety-nines. Run two copies of the server, plant the fault in only one, send load to both, and put the wrong query, average of per-server p ninety-nines, right next to the right one, summed buckets. Measure the gap. Then write a cause alert, CPU above eighty percent, and check it against your fault runs.

B: And it fires on... at least one of them?

A: [flatly] None of them. Every one of those faults is time spent waiting, not computing. And on the Spark, the equivalent "GPU above ninety percent" would fire on every healthy benchmark, because a busy inference server is supposed to be busy. Missed real problems, plus constant false alarms. That's alert fatigue in one panel.

<!-- section: Scaling it -->

B: Okay, so this is one server and one teammate. What happens when it's, like, two hundred servers and fifty customers?

A: Metrics mostly scale fine, if the labels stay bounded. Two hundred instances times a few hundred series each is tens of thousands of series. Easy for Prometheus. The danger is any label that grows with customers or requests. "Customer" with fifty values, that might be acceptable. "User", or "prompt", never. And you'd add recording rules, which are queries Prometheus runs ahead of time and stores, so the fleet-wide histograms are already summed and your dashboard isn't adding up two hundred instances on every refresh. Logs stop being free. Two hundred servers at hundreds of requests a second is terabytes a day. So you keep all the errors and slow requests and sample the rest. Traces need sampling too, ideally tail sampling, so every slow or failed trace survives. Per-customer questions go to trace attributes and logs. Alerts have to be on the fleet's S L O, not on individual machines, or one bad host pages you every night. And you'd run a profiler continuously, because with two hundred machines, something is always slow somewhere.

<!-- section: Connections and close -->

A: And this pays off every time you change the server from here on. Batching should shrink that queue wait span you just watched take over. Prefix caching gives you the K V utilization and hit-rate gauges to watch. And when you dig into agent harnesses, one trace per agent run becomes the main debugging tool. The cache-lock fault, by the way, is just the lock from processes and threads, seen from the outside. Every one of those changes becomes a before-and-after on a dashboard instead of a guess. If you read one thing after this, make it the Dapper paper, it's short. And then the S R E workbook's chapter on alerting on S L Os.

B: [working it out] Okay, let me try the whole thing. You can't find production bugs by reading code, because the code's the same and the world around it isn't. So you make the server write things down. Metrics are cheap counts, so you watch averages on a dashboard. Traces show you which step in one request got slow. Logs give you the details. And you alert when the numbers look bad.

A: [gently] Almost. Two fixes. Not averages. Averages are exactly what hides the problem. You watch percentiles, built from bucket counts that you add up across servers first. And not "when the numbers look bad". You alert on what users feel, the fraction of requests that broke your promise, measured as how fast you're burning the budget. Never on CPU. Then it's the order you go in. The metric tells you something's wrong. The trace tells you where. The logs and attributes tell you which requests and why. And one ID, stamped on all three, is what lets you walk from one to the next.
