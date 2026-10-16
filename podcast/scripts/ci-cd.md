<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture this. You've been on a branch for three weeks. It's the hard-negative mining work for the cross-encoder. There's a new sampler, a change to the feature pipeline, a little tweak to the loss. And locally? Everything passes. N D C G at ten, so the score for how good your top ten results are, is up two points. You're feeling great. Meanwhile, a teammate has been busy too. They refactored the feature pipeline you touched. They renamed the function your sampler calls. And they moved the tokenizer config somewhere else.

B: Oh no. I can see where this is going.

A: Merge day. Git says fourteen files have conflicts. You spend an afternoon resolving them, and honestly, mostly by guessing what the other person meant. Okay, now the code merges. But it doesn't run, because your sampler is calling a function that, under that name, doesn't exist anymore. You fix that. Now it runs... but N D C G is down a point. And nobody knows whose change did it, because there are a hundred and forty commits between the last state anyone knew was good and right now. And then your teammate tries it on their machine and it just fails outright. Your code reads a cached tokenizer file that only exists on your laptop.

B: [a bit sheepish] Okay, so my honest reaction is that's a git skills problem. Like, if I were better at rebasing, or had a nicer merge tool, merge day would've been an hour, not an afternoon.

A: [gently] See, I don't think any of that is about git commands. You know the commands. Every one of those problems is about time. How long work stays apart before it gets combined. And how long a mistake lives before anyone sees it. Fourteen conflicts is what three weeks apart looks like. A hundred and forty suspects is what a mistake that lived for three weeks looks like. And source control and C I C D, at heart, they're tools for shrinking both of those.

B: Huh. So it's not really about the tooling at all.

A: The tooling is how you get the time down. But time's the thing. Keep that in your head and everything else in this falls into place.

<!-- section: Origin -->

A: And people learned this the hard way, over about thirty years. Go back to the nineteen eighties, early nineties. Big software projects ran like this. Teams built their parts separately, for months. And then there was a scheduled phase at the end called integration, where you put all the parts together. And that phase routinely took longer than building the parts. And nobody could predict how long. Programmers had a name for it. Integration hell. Every piece worked on its own. The whole thing didn't. And the reasons were buried under months of unrelated changes.

B: So it's my merge day, but for a whole company.

A: Your merge day, times a few hundred people, times six months. So the first fix was pure brute force. Build everything, every day. Microsoft famously ran a daily build of Windows N T, with what they called a smoke test, basically, turn it on and see if anything catches fire. Steve McConnell wrote that practice up in nineteen ninety-six, in a short piece called "Daily Build and Smoke Test". And the rule was, if you broke the build, fixing it came before anything else. In some teams, you also had to wear a silly hat until someone else broke it.

B: [laughs] That's a better incentive than most code review policies.

A: Honestly, yeah. Then the phrase itself. Grady Booch used "continuous integration" back in nineteen ninety-one. And Kent Beck's Extreme Programming, later in the nineties, turned it into a hard rule. Integrate many times a day, and run all the tests every single time. Martin Fowler wrote the description everyone still links to, an article just called "Continuous Integration", in two thousand, and heavily revised in two thousand six. His colleagues at a consultancy called ThoughtWorks built CruiseControl in two thousand one, which was the first popular C I server. Which is really just a machine that watches the repository and builds every change. Then Hudson in two thousand five, which got renamed Jenkins in two thousand eleven, made it everywhere. Travis C I, also two thousand eleven, put it in the cloud for free. And GitHub Actions, in twenty nineteen, put it in the same place as the code.

B: So by then, building and testing every change was solved.

A: And so the question moved downstream. If every change is built and tested... why is shipping it still this scary, manual thing that happens once a quarter? Jez Humble and David Farley wrote a book in twenty ten called Continuous Delivery, and their answer was, make every green build releasable, automate the release, and do it so often it gets boring. And the cost of not doing that got a famous price tag. August first, twenty twelve. A trading firm called Knight Capital deployed new trading code. By hand. To eight servers. And they missed one. On that one server, an old feature flag woke up some old dormant code. And in about forty-five minutes the firm lost roughly four hundred and sixty million dollars.

B: [stunned] In forty-five minutes.

A: Forty-five minutes. And the code wasn't the root problem. The deploy process was. Somebody copying things onto servers by hand and missing one. There's a detail in there about that flag that'll matter later, so hang on to it.

<!-- section: The Idea: Source control is a history of snapshots -->

A: [settling in] Okay. So let's start with source control itself, and strip away the commands. It answers three questions. What does the project look like right now? What did it look like at any point in the past? And how do several people change it at the same time without trampling each other?

A: [brisk] The oldest tools tracked one file at a time. S C C S at Bell Labs in nineteen seventy-two, then R C S and C V S after it. Each file had its own chain of edits. Subversion, in two thousand, tracked versions of the whole project, but it kept one central server that everybody had to talk to. And then git took a different idea. A much simpler one. And that idea is the thing worth actually understanding.

B: Git came out of Linux, right? Linus?

A: Right. And it's a good story. The Linux kernel had been using a proprietary version control system called BitKeeper, under a free license. In April two thousand five, after a dispute, that license got pulled. And Linus Torvalds needed a replacement that could handle thousands of contributors with patches flowing in constantly, and nothing free was fast enough. So he wrote the first version of git. In about two weeks. And it could be fast and solid because its core is tiny. It's a key-value store, where every key is the hash of its value.

B: [working it out] Wait, say that again. The key is the hash of the value?

A: Yeah. So, normally when you store something, you pick a name for it. A file path, an ID, whatever. Git doesn't let you pick. It takes the bytes, runs them through a fingerprint function, and the fingerprint is the name. That fingerprint function is a hash. You feed it any amount of data and it gives you back a fixed-size fingerprint. In git's case it's forty hex characters, so forty digits where each one is zero through nine or a through f, from an algorithm called S H A one. Change one single bit of the input and the fingerprint comes out completely different. And two different inputs landing on the same fingerprint is, practically speaking, impossible. And naming data by a fingerprint of the data itself has a name. Content addressing. Same content, same name. Always.

A: So git keeps exactly three kinds of these objects. There's technically a fourth, tags, we'll skip them. The first is a blob. A blob is one file's contents. Just the bytes. Not even the filename.

B: Then where does the name go?

A: Into the second kind. A tree. A tree is one directory. It's a list, and each entry says, here's a name, here's the file mode, and here's the hash of the blob, or the hash of another tree if it's a subfolder. So filenames live in trees, contents live in blobs. And the third kind is a commit. A commit points at one root tree, which is the whole project as a snapshot, plus the commit or commits that came before it, plus who made it, when, and the message saying why.

A: And that's... the whole data model. Really.

B: [skeptical] Hmm. I always thought a commit was a diff. Like, git stores what changed, and to get the current code it replays all the changes from the start.

A: That's the picture most people have, and it's the opposite of what git does. A commit doesn't store what changed. It stores the entire project, by pointing at a tree.

B: That sounds wildly expensive, though. A full copy every commit?

A: It sounds expensive. Content addressing makes it nearly free. If a file didn't change, its bytes are the same, so its hash is the same, so the new tree just points at the old blob that's already there. Only the things that actually changed get new objects. So here's one to try. You make an empty repo. You add a file, a dot t x t, and it just contains the word hello. Commit. Then you add a second file inside a folder, sub slash b dot t x t, and it also contains exactly hello. Commit again. How many new objects does that second commit create?

B: Um. New file, so a blob. The folder's a tree. The root directory changed, so a new root tree. And the commit itself. So... four?

A: [warmly] Three. Your list is right except for the blob. The file in the folder has exactly the same bytes as a dot t x t, so it hashes to exactly the same name, a hash that starts c e zero one three six, and that object already exists. So git doesn't write anything. You get a new tree for the sub folder, a new root tree because the root now has a new entry, and the new commit. The lesson actually ran this on a Mac. Three objects after the first commit, six after the second.

B: [amused] Okay, that's kind of neat. Two files, one blob.

A: And now the part that makes git feel like magic once you see it. What do you think a branch is?

B: I mean... a copy of the code? A separate line of history you're working on.

A: A branch is a text file that's forty-one bytes long. That's it. It holds one commit hash, forty characters, and a newline. It lives at refs slash heads slash main, inside the dot git folder. Making a new branch writes one more file like that. And there's another file called HEAD, all caps, that just says which branch you're on. And when you commit, git creates the new objects and then moves the pointer. Rewrites that forty-one-byte file with the new hash. Nothing else happens.

B: So "being on a branch" just means... new commits move that pointer forward.

A: Yep, that's all it is. Picture it drawn out. Up in the corner there's a little box labelled HEAD with an arrow to a box called main. Below main there's another box called exp, a second branch. Both of those are just tiny files with a hash in them. Main points at a commit, call it C two. Exp points at an older commit, C one. And C two has an arrow back to C one, its parent. Each commit has an arrow down to its own root tree. C one's tree just lists a dot t x t. C two's tree lists a dot t x t and the sub folder, and the sub folder has its own little tree with b dot t x t. And at the bottom there's exactly one blob, the bytes hello and a newline, with three arrows landing on it. One from each tree that mentions a file with those bytes. And every single box in that picture is a file in the objects folder, named by its own hash.

B: Huh. So the whole repo is basically a pile of files pointing at each other by hash.

A: That's it. And three things you already rely on fall straight out of that. First, history can't be quietly edited. A commit's hash covers its tree and its parent's hash. And the parent's hash covers its parent, all the way down. So if you change one byte in an old file, every hash above it changes. It's the same chain-of-hashes trick as a blockchain, just used fifteen years earlier, for something useful.

B: [working it out] Oh. So that's why rebase gives my commits new hashes. Because it changes the parent.

A: Right. They are genuinely new commits. Not the old ones moved. Second thing. Branches are free. Making one writes forty-one bytes. And that's why git pushed a style of branching that would've been unthinkable in C V S, where a branch meant copying history around on a server. And third, every clone is a full backup. The object store is the whole history. GitHub just holds one more copy. It's special to your team, not to git.

B: [skeptical] Okay, but I've definitely read somewhere that git does store deltas. Compressed differences.

A: [conceding] It does, underneath. When git cleans up, the command is git g c, it packs objects into one big compressed file called a packfile, and similar objects get stored as differences against each other to save space. But that's a storage trick. The model, the thing you reason with, is still snapshots. And when you run git diff, git computes the differences right then, on demand, by comparing two trees.

<!-- section: The Idea: Merging, and why small merges win -->

A: So now the part that bit you on merge day. When you merge a branch into main, git first finds what's called the merge base. That's the last commit both sides share. The point where they split. Then it does a three-way merge. For each file, it compares the base to main, and the base to your branch. If only one side changed some region, it just takes that change. If both sides changed the same region differently, that's a merge conflict. Git can't know which version is right, or which combination of them, so a human has to decide. And the result is a commit with two parents.

A: And conflicts aren't random bad luck. They have arithmetic.

B: Okay, this I want to hear.

A: [working it out] Say the repo has a thousand files. Each developer touches about ten different files a week, spread at random. Two developers, each on a branch that lives for one week. What's the chance their branches touch at least one common file? So take one of my ten files. Your ten files are ten out of a thousand, so there's a one percent chance my file is one of yours. Ninety-nine percent chance it isn't. For no overlap at all, all ten of my files have to miss, so that's ninety-nine percent, multiplied by itself ten times. Which comes out to about ninety percent. So there's roughly a ten percent chance of a conflict.

B: Okay. One in ten. Not terrible.

A: Now same two people, same pace, but the branches live for four weeks before merging. So forty files each. The work is four times bigger. How much likelier is a conflict?

B: Four times the work... four times as likely? Forty percent?

A: [pleased] About eighty percent. Eight times likelier, not four. Now each of my files has a four percent chance of being in your forty, and all forty of mine have to miss. That comes out to about twenty percent no overlap, so eighty percent you collide. And the reason it's not four times is that the chance grows roughly with the square of the branch size, while it's small. Each of my files can hit any of your files. So it's roughly my count times your count, over a thousand. Ten times ten is a hundred. Forty times forty is sixteen hundred. Then it bends over and saturates near certainty, which is why it stops at eight times and not sixteen. And the lesson checked both numbers with a quick simulation. Nine point four percent, and eighty-one percent.

B: [a bit unsure] Okay, but that's two people. What happens with a real team?

A: That's the other square. With eight developers, how many pairs of branches can collide? Each of the eight can pair with seven others, and you halve it because a pair is a pair either way. Twenty-eight pairs. At one week, twenty-eight pairs times a ten percent chance, that's about three colliding pairs every merge round. At four weeks, twenty-eight times eighty percent, about twenty-two.

B: Twenty-two out of twenty-eight. So basically everyone's colliding with everyone.

A: Basically. So pairs grow with the square of the team size. Overlap grows with the square of the branch size. And the two multiply. So integration pain, per merge, goes roughly like the number of people squared, times the branch lifetime squared. And now flip it around. Merge four times as often. Each merge has about a sixteenth of the pain. You do four times as many merges. So the total still drops by about four. And every conflict you do hit is smaller and fresher. You wrote that code this morning. You still remember what it was for.

B: Right, versus guessing what my teammate meant three weeks ago.

A: And there's a worse kind of conflict. One git can't even see. It's called a semantic conflict. Two changes that merge perfectly cleanly, line by line, and are broken when you put them together. Your sampler called build features. Your teammate renamed it to featurize. Those are different files. There's no overlap in the text at all. Git merges it, no complaint. And it crashes. The only thing that catches that is actually building and running the combined code. Hold that thought, because that's the entire argument for C I.

<!-- section: The Idea: Big bang vs continuous figure -->

A: [relaxed] There's a toy you can play with for this. Imagine two timelines, one above the other. Each row in a timeline is a developer. And along each row there are these pale blocks, stretches of work that haven't been merged yet. Along the main line, there are circles wherever a merge hit conflicts, and the bigger the circle, the more edits someone had to reconcile. And then there are bug lines. A dot where somebody wrote a bug, and a line stretching right until the next merge, which is when the tests finally run and catch it. The top timeline merges every twenty days. The bottom one merges every day. Same edits, same bugs, just two schedules. And you've got three sliders. How many developers, how many files each person edits per day, and how many days between the big-bang merges.

A: The model behind it is a toy. Six hundred files, a few hot ones that everybody touches, like config and shared utilities. Two percent of edits carry a bug. And the tests catch a bug at the next merge. But the shape is honest. So, three things to try. Drag developers down to one. No conflicts. At any schedule. Integration hell is a team problem. But the bugs still hide until a merge runs the tests, and that part isn't about people. It's about feedback.

B: Oh, that's interesting. So even solo, the long branch still hurts. Just in a different way.

A: Yep. Then put it back on big-bang and drag developers from two up to twelve. The conflict work grows much, much faster than in a straight line. That's the pairs, the squared thing. And third, drag the big-bang interval down. Somewhere around every two to five days, most of the pain is just... gone.

B: So "merge every day" isn't some magic number.

A: No. The win isn't daily. It's short enough that branches can't drift very far apart.

<!-- section: The Idea: The feedback loop -->

A: Now those bug lines, that's the second half of the story. A bug is cheap at the moment you write it. You're looking right at the code, it's all in your head, and the only suspect is the last thing you typed. And every hour it survives, it gets more expensive. And not for any mystical reason. For mechanical ones. First, more suspects. Find it right after one commit and there's one place to look. Find it after a hundred and forty commits and you're bisecting, which means binary search through history, checking out the middle commit, testing, halving again. Second, lost context. Two weeks later, you've forgotten why you wrote it, and the person who wrote the code next to it is on vacation. Third, things get built on top of it. Other code, other people's branches, a checkpoint you trained, a report to your manager. All of them assumed that bug wasn't there. And fourth, blast radius. In your editor, a bug hurts you. In production, it hurts users. Maybe their data.

B: There's that chart, right? A bug costs a hundred times more to fix in production than in design. I've seen that in, like, every slide deck about testing.

A: [amused] You have, and it's worth being careful with. It usually gets pinned on Barry Boehm's nineteen eighty-one book. But the original data came from big projects in the nineteen seventies. And later on people went digging, and there's a really fun takedown called The Leprechauns of Software Engineering, by Laurent Bossavit, showing how thin and mangled the evidence behind that famous curve actually is. So, the direction? Nobody disputes it. Later is more expensive. The exact multiplier is the shaky part. So argue from the mechanism. Suspects, context, things on top, blast radius. Not from the chart.

B: Okay, fair.

A: So picture a ladder. Each rung is a place a mistake can get noticed. Top rung, your editor or a type checker. You know in seconds, and the suspect is one line. Next, local tests. About a minute, and the suspect is your last edit. Then C I on a clean machine. Roughly five to fifteen minutes, and the suspect is one commit, or one pull request. Then code review. Hours. One pull request, checked by eye. Then staging, or a big merge. Days. Dozens of pull requests. And at the bottom, production, with users. Days to weeks. And the suspect is... everything. And as you go down, both numbers grow. These are rough orders of magnitude, but that's the shape.

B: So C I's not at the top. It's third.

A: Third. And that's fine, because its job isn't to be first. Its job is to pull detection up the ladder. To catch on a clean machine in minutes what would otherwise show up in staging or production days later.

<!-- section: The Idea: Continuous integration, precisely -->

A: And now the actual definition will sound obvious. Which is kind of the point.

B: I mean, I'd have said C I is GitHub Actions. The thing that runs your tests when you push.

A: That's the tool. Continuous integration is a practice. Everyone merges their work into the shared main line at least once a day. Every merge gets built and tested automatically, on a clean machine. And if the build breaks, fixing it is the team's top priority. Fowler's article lists the habits that make it work, and the core ones are pretty short. One shared main line, and everybody merges into it often. If people keep branches alive for weeks and "use C I" on them, they've bought the tool and skipped the practice.

B: [laughs] Okay, that's... that was my merge-day branch.

A: Yeah, it was. Next. The build is automated, and it's self-testing. One command takes you from source code to a checked, runnable thing. Every change builds on a separate, clean machine. Not just on the author's laptop. Keep it fast. Fowler's rule of thumb is about ten minutes. Because a slow build gets skipped, or batched up, or ignored, and then you're right back to big merges. And a red build gets fixed immediately. Usually by reverting the change, not by debugging on top of it while everyone else is blocked.

A: Then there's a handful of words on the tool side. A pipeline is the automated sequence of steps a change goes through. Install, build, test, package, deploy. Each step has to pass for the next one to run. In GitHub Actions, a workflow defines a pipeline. It's a yaml file sitting in the dot github slash workflows folder, and it says when to run, so on a push, on a pull request, on a schedule, or by hand, and what jobs to run. Jobs are made of steps. And each job runs on a runner, which is the machine, usually a fresh virtual machine, that runs the job and then gets thrown away. And the result goes back onto the pull request as a status check. A pass or fail mark on the commit. And GitHub can be told to block merging until certain checks pass.

B: [skeptical] Why does it have to be a clean machine, though? My laptop's fine. My laptop runs the tests.

A: [amused] Your laptop lies. It's got the cached tokenizer file from the opening. It's got some package you pip installed by hand six months ago and forgot about. And on a Mac, the file system ignores upper and lower case by default. So if your code imports Figure with a capital F, and the actual file is called figure, lowercase, the Mac just finds it. The Linux server won't. So "works on my machine" isn't really a joke about careless people. It's the default state of any machine that's been used for a while.

A: A fresh runner starts from nothing except what's written down in the repo. The code. The workflow. And the lockfile. That's a file, package lock dot json for Node, or u v dot lock or poetry dot lock for Python, that records the exact version of every dependency, including the dependencies of your dependencies. So every install gets the same bytes. If the build passes on that fresh machine, it'll pass anywhere that starts from those same things. And that's also why C I uses N P M C I instead of N P M install. The C I version installs exactly what the lockfile says. And if your package file and the lockfile disagree, it fails, instead of quietly updating the lockfile for you.

<!-- section: The Idea: Continuous delivery -->

A: So C I answers one question. Does the combined code work? The next question is, how does it reach users? And this is where the two C Ds split.

B: [a bit unsure] Yeah, I've never been sure there's actually a difference. Continuous delivery, continuous deployment. Aren't those just... two names for the same thing?

A: [amused] They differ by exactly one human. Continuous delivery means every change that passes the pipeline could go to production, at the push of a button, with the release automated. No heroics. But a person still chooses when. Continuous deployment means every green build does go out. Automatically. No human step at all. And the site you'll build the pipeline for works the second way.

A: And either way, a few ideas carry the weight. First one. Build once, and promote the artifact. An artifact is just the packaged output of a build. For this site, it's the dist folder, all the built static files. For a service, maybe a container image. For a Python library, a wheel. For you, a lot of the time, a model checkpoint. And it gets identified by a version or a hash, stored, and deployed exactly as is. The rule is, build it once, test it, and deploy those exact bytes. Rather than rebuilding it again for every stage and hoping the rebuild comes out the same. Because a rebuild can quietly pick up a different dependency version, or a different environment, and then what you ship isn't what you tested.

B: Oh, that's the git thing again. Naming exactly what you've got.

A: It's the same idea. If you can name exactly what you tested, you can deploy exactly what you tested. Second idea, environments. An environment is a place the software runs, with its own config and its own data. Typically there's a preview, one per pull request. There's staging, a copy that mimics production. And there's production. The artifact moves through them unchanged. Only the config is different.

A: Picture the whole pipeline as a line going left to right. On the far left, a push or a pull request, tagged with its commit hash. That kicks off a fresh runner, which you can draw as a dashed box, because it gets thrown away afterwards. Inside it, four steps in a row. Install, which is that N P M C I. Build. Test, which for this site is checking the links and that every lesson exists. And package, turning the dist folder into an artifact. If the test step goes red, everything stops there. Nothing ships. If it's green, the artifact goes out to the right. A preview for the pull request, then staging, same bytes, then production, which is pointing at, say, artifact version forty-two. And underneath, an artifact store holding versions forty, forty-one, and forty-two, the live one.

A: Which brings us to the third idea. A rollback is going back to the last version that worked. Ideally by redeploying an artifact you already have, rather than building a fix under pressure. And notice how much that looks like a git branch. If production is just a pointer to artifact forty-two, rolling back is moving the pointer to forty-one. That takes seconds, and it needs no new code. Which is exactly what you want at three in the morning. The alternative is called rolling forward. You write a fix, you push it through the whole pipeline. That's fine when the fix is obvious and the pipeline is fast. And it's a disaster when neither of those is true.

B: Okay, so rollback is basically an undo button for production.

A: For what the pipeline controls. That's the honest caveat. If version forty-two changed a database schema, or wrote bad data, putting forty-one's code back doesn't un-write any of it. And that's why teams change databases in backward-compatible steps. You add the new column. You deploy code that writes to both the old and the new. And only later, once nothing reads the old one, you drop it. So at every step, the previous version of the code still works against the database.

B: Got it. So the code can go back, but the data doesn't come with it.

A: Right. So here's a real one. The site deploys from main. A bad commit just went live. You've got two ways back. One, git revert the bad commit and push, and the pipeline rebuilds and redeploys. Two, redeploy the artifact from the previous successful run. Which is faster? And which one leaves main correct?

B: Redeploying the old artifact is faster, obviously. No install, no build, no tests. It's already there. So I'd just do that and be done.

A: [gently] Faster, yes. For this tiny site the gap is small, maybe a minute. For a service with a twenty-minute build, it's the whole game. But you're not done. After you redeploy, main still has the bad commit in it. So the next time anyone pushes anything, the pipeline builds main, and redeploys the bad commit.

B: [groans] Oh. Right. Production goes back to broken on a totally unrelated push.

A: Yep. And git revert is slower, but afterwards main and production agree. So real teams usually do both. Redeploy the old artifact to stop the bleeding, then revert on main, so the next deploy is also good. And in the build, you get to time both.

A: Next idea. Feature flags. A feature flag is a switch, read at run time from config, that turns some code on or off without deploying again. It separates deploying code from releasing it. So your hard-negative sampler. It could've been merged into main on day two. Wrapped in an if statement that checks a hard negatives flag, defaulting to off.

B: Wait. So I could've merged on day two? With half a feature?

A: With half a feature, switched off. It's integrated. It builds. It's tested. Nobody's branch drifts away from it, so your teammate's rename would have broken your code on day two, in their pull request, in front of them. But nothing changes for users until you flip the flag. And flipping it back is instant. That's the trick that makes daily merging possible for work that takes three weeks.

A: [more serious] And this is where the Knight Capital detail comes back. Flags are code too. What Knight did was reuse the name of an old flag for some new behaviour. And one server, the one they missed, still had the old code that read that flag. So when they turned the flag on, that one server woke up years-old dead code. And nobody had ever cleaned up the old flags. So the lesson is, delete flags when they've done their job.

B: [quietly] That's a brutal way to learn that.

A: Four hundred sixty million dollars' worth. Okay, put all of this together and you get what's called trunk-based development. One main branch, the trunk. Short-lived branches that live for hours, or a day or two at most. Flags for anything unfinished. Instead of long-lived feature branches or release branches. Google famously runs most of its code in one enormous repository, on a single trunk, with tens of thousands of engineers committing to it. There's a paper about it in Communications of the A C M, by Rachel Potvin and Josh Levenberg, twenty sixteen, and it's worth reading just for the scale.

B: [skeptical] See, my instinct is that's a trade-off. You move faster, you merge more, so you break more things. Speed versus safety.

A: [firmly] That's the intuition the research kills. There's a book called Accelerate, by Nicole Forsgren, Jez Humble and Gene Kim, built on years of State of DevOps survey data. And they found trunk-based habits and frequent deploys go together with both faster delivery and fewer failures. Both at once. Because the changes are small, so each one is easy to check and easy to undo.

B: Okay, so then what happens as the team grows? Say it's five engineers on one repo, and it becomes fifty. What breaks?

A: A few things. First, integration pain grows with the square of the people. Five people is ten pairs. Fifty people is twelve hundred and twenty-five pairs. So long-lived branches become hopeless. You need trunk-based development, small pull requests, and flags. Second, the test suite grows too, so the pipeline slows past that ten-minute budget. So you run tests in parallel, split them across machines, which is called sharding, cache builds, and run only the tests a change could actually affect. Google and others use build systems like Bazel, which know the full dependency graph, so they know which tests a change can reach. Third, with many merges per hour, two pull requests that each pass on their own can break main together. So you add a merge queue, which tests each pull request on top of the very latest main, right before it merges. Fourth, flaky tests, the ones that fail randomly, become a constant tax at that size. So you track them and quarantine them. And fifth, deploys need to go out gradually, with canaries and flags, because more changes per day means more chances to break production. So rollback has to be fast, and automatic.

A: And the last piece makes the rules actually enforceable. Branch protection. On GitHub they're now called rulesets, or branch protection rules. It's a setting that says, nobody pushes to main directly. Changes come through a pull request. And the pull request can't merge until the C I check is green. Without it, C I is advice. With it, a red build physically can't reach production.

<!-- section: The Idea: What changes for ML -->

A: [warmly] Okay. So now, your world. In ordinary software, the behaviour lives in the code. So if you test the code, you've tested the behaviour. In M L, behaviour lives in three things. The code, the data, and the weights. And a pipeline that only tests code will happily ship a model trained on a broken dataset. There's a Google paper from twenty fifteen, "Hidden Technical Debt in Machine Learning Systems", by Sculley and others, that made this point really memorably. It draws the model code as a tiny box in the middle of a big diagram. All around it is data collection, feature extraction, configuration, monitoring. And most of the failures live in the big diagram, not the tiny box.

B: [dry] Yeah. That matches my experience.

A: So "the build is green" has to mean more for a model, and each extra check catches a different kind of bug. First, plain unit tests on the code. The tokenizer pads correctly. The loss is zero for a perfect prediction. The sampler never returns the positive as a negative. Fast, run on every push, just like normal C I. Second, data validation. The new training set has the columns and types you expect. The rate of missing values and the balance of labels haven't suddenly jumped. And no query in the eval set shows up in the training set. That one's leakage. The classic way to get a beautiful number that means nothing. And you run these when the data changes, not just when code does.

A: Third, an eval gate. You train or fine-tune, or for a big model, load the candidate checkpoint. You run it on a frozen eval set. And you fail the whole pipeline if the metric drops past a threshold, compared to the model that's currently in production. For your cross-encoder, that's N D C G at ten, or M R R, mean reciprocal rank, basically how high up the first right answer lands, on a fixed set of queries.

B: So that's... basically my validation harness.

A: That's exactly where your validation harness lives. A harness you run by hand is a test suite you run sometimes. Wire it into the pipeline as a required check, and it becomes a gate nothing can skip. Fourth, the model is an artifact. The checkpoint gets stored with its hash, the commit that produced it, and the version of the dataset it saw. Deploying means pointing the server at a checkpoint ID. Rolling back means pointing it back. Same pointer trick, again. And fifth, gradual release. Shadow traffic, where the new model scores real queries and the results get logged but never shown to anyone. Or a canary, where one percent of real traffic goes to the new model. And you watch the metrics before you go to a hundred percent. It's basically a feature flag for models. And the rule of thumb across all five: cheap checks on every push, the expensive training and evals when their inputs change, or on a schedule.

B: [working it out] Okay, so for the eval gate, I'd set it pretty tight. Like, fail if N D C G drops by half a point, zero point zero zero five. I don't want any regression getting through.

A: [gently] And that's the M L-specific trap. The eval metric is noisy. Say N D C G at ten on five hundred queries wobbles by about plus or minus zero point zero one between two runs of the same model, just with different random seeds. Then a gate that fails at a drop of zero point zero zero five is a coin flip. It'll fail good models for no reason. And a flaky gate trains the whole team to click "re-run" until it goes green. So you measure the noise first, and then set the threshold above it. There's a whole lesson on doing that properly, "Is that improvement real?" And the frozen eval set has to stay frozen, which is its own lesson too.

A: So the picture for a ranking model. On the left, three inputs. Code, data, config. Code goes through unit tests on every push. Data goes through validation, schema, missing values, leaks. Everything feeds into training or fine-tuning. Then the eval gate, the thick box in the middle, N D C G at ten on the frozen set, compared to production, above the noise. If it passes, it drops into a model registry, which stores the checkpoint hash, the commit, and the data version. From there, shadow, then canary, one percent up to a hundred, watched. And finally production, pointing at a checkpoint ID. And off to the side, in blue: fail any gate, nothing ships.

<!-- section: Build It: Git by hand -->

A: So the build has two parts. First you take git apart by hand, so "a commit is a pointer to a snapshot" is something you've actually seen, not just been told. Then you give this site the pipeline it deserves. You're reading a lesson that, by the end, will have been tested and deployed by the pipeline it describes.

A: Part one. Make a throwaway repo, and watch the objects folder inside dot git as you go. Right after git init it's empty. Then you write hello into a dot t x t and git add it. And one file appears in the objects folder. Before any commit. Just from adding.

B: Huh. So add already writes the blob.

A: Add writes the blob. Commit writes the trees and the commit. You can ask git what that object is with git cat file, and it says blob. Then commit, and now there are three. You print the commit, and it's plain text. A tree hash, an author, a message. You print the tree, and it's a line per entry. Mode, type, hash, name. Then you look at the HEAD file, and it says "ref, refs heads main". And the main file has a hash in it. HEAD names a branch, the branch names a commit. Then you add sub slash b dot t x t with hello in it, commit, and count again. That's checking the three-not-four answer for yourself. Then make a branch called exp, list the heads folder, and look at the size of the file that is the branch.

B: Forty-one bytes.

A: Forty-one bytes. Then you write your own git cat file. About fifteen lines of Python. The objects live in a folder named after the first two characters of the hash, and the file inside is named by the other thirty-eight. The file is compressed with zlib. Decompress it and you get a little header, which is the type, a space, and the size, then a zero byte, then the actual contents. So you split on that first zero byte, and you've got the type and the body. And then a second function, hash blob, that tells you what git would name some bytes. The catch is, the S H A one runs over the header plus the body. Not the body alone.

B: Why include the header? The body's the content.

A: Because then the type and the length are part of the name too. A blob and a tree with coincidentally the same bytes can't end up with the same name. And the way you check yourself is, your hash of hello and a newline has to match what git hash object prints for the same thing. Trees are a little uglier, because their bodies are binary. Names, followed by twenty raw bytes of hash. So just print the raw bytes and pick out the filenames. Parsing them properly is a nice extra. And the last step of part one: in the actual Workbench repo, count the objects and count the commits. That's the entire history of the site, on your disk. No GitHub needed.

<!-- section: Build It: The pipeline for the site -->

A: Part two. Put the site on GitHub, and decide where it lives, because it changes one line of config. A GitHub Pages project site is served from a sub-path. So your username dot github dot io, slash workbench. And that means every single URL the site generates has to start with slash workbench. Otherwise the browser asks for slash lessons at the root, which doesn't exist. Astro handles this with an option called base. The layouts in this repo already build their links from the base URL, so setting base to slash workbench fixes them.

A: There are two ways to keep base at plain slash, if you'd rather. Name the repo your username dot github dot io, which makes it a user site, served from the root. Or attach a custom domain. Your home server over Tailscale serves from the root too. Pick one. But don't touch any lesson links yet. Your link checker's about to tell you something. Then in the repo's Pages settings, set the source to GitHub Actions. And one thing to check: Pages and branch protection on a private repo need a paid GitHub plan. On a public repo, both are free.

A: Then the tests. And here's the thing. Astro build passing proves the M D X compiled. It doesn't prove the site works. So you write a checker in Python, standard library only. It takes the build folder and the base path, and it exits with a failure code if anything's wrong. It walks every built page and collects every link and every image or script source, plus every element ID, so it can check links that jump to a spot on a page. Then for each link, it works out which file in the build folder that link should land on. External links, email links, and links that are only a jump within the page, it skips. A link to a folder means that folder's index page. A link that starts at the root but doesn't start with the base path is broken by definition. And relative links get resolved against the page's own folder. Then the main check is two things. Every lesson slug in the curriculum file has a built page. And every internal link and every jump target points at something that really exists. Print each failure as the word BROKEN, the page, the link. Then a one-line summary, and exit with a failure if there were any.

A: And then the question. Build with base set to slash workbench and run your checker. How many broken links do you expect? Zero, a handful, or dozens?

B: Zero? I mean, the build passed. And you said the layouts already use the base.

A: [amused] Dozens. When the lesson's author built this repo with base slash workbench and ran a reference checker, it found fifty-five broken links, out of eight hundred and eight internal ones. And that count will have changed as lessons got added. With base at the root, it found zero. The layouts were fine. Every single broken link was written by hand, in a lesson file or the method page. Things like a link to the stack and heap lesson, written as slash lessons slash stack and heap. A link like that, starting at the root, in Markdown, gets passed through exactly as written, so it skips the base. And in dev, the base is effectively the root, so it all works.

B: [slowly] Which is exactly how "works on my machine" sneaks in.

A: That's exactly how. And the fix is your call. Relative links, so from one lesson page, dot dot slash stack and heap reaches the other one under any base. Or a tiny plugin for the Markdown step that adds the base in front of any lesson link. Or just deploy to a root. What matters is that the checker now runs on every push, so the next hard-coded link can't reach production. And once you've written it, have an agent review it for the cases you missed. Links with query strings, sources on images and scripts, paths with percent-encoded characters in them.

A: Then the workflow file itself. It's boilerplate, but every line in it is a decision from earlier. It triggers on a push to main. It also triggers on pull requests, but those build and test and never deploy. And it has a manual "Run workflow" button, with an optional commit hash you can type in, and that button is your rollback. For permissions, it can read the repo contents, write to Pages, and get an identity token, which is how it proves to Pages that this run is who it says it is. Then a build job, on a fresh Ubuntu runner. Check out the code, which is the commit you typed in, or the pushed commit if you left it blank. Set up Node twenty-two, with the N P M cache on. The current Astro needs at least twenty-two point twenty-two. Then N P M C I, astro build, your checker, and upload the dist folder as the Pages artifact.

A: Then a deploy job. It's skipped on pull requests. It needs the build job, so no green build, no deploy. It has a concurrency rule, one deploy at a time, and if one's already running, let it finish rather than cancelling it halfway. And it deploys to an environment called github pages. Before you push, check the current major versions of the four official actions it uses, because those get bumped every year or so. Astro also publishes its own action that wraps install and build, and that's fine too, but writing out the steps teaches you more. Then push, open the Actions tab, watch the run, note how long each step took, and open the deployed URL.

A: Then make the rules stick. In the repo settings, make a branch ruleset on the default branch. Require a pull request before merging. Require status checks to pass, and pick the build job. It only shows up in that list after it's run once. And block force pushes. You can leave yourself a bypass for emergencies, but notice that it exists. Then prove it. On a branch, add a link to a lesson that doesn't exist, open a pull request, and watch the check go red and the merge button refuse. Fix it on the same branch, and watch it go green. Have an agent explain anything on that settings screen you don't get, but click the buttons yourself.

<!-- section: Build It: The rollback drill -->

A: [playful] And then the fun one. Break production on purpose, and time everything. Change the title of one lesson in the curriculum file to the word BROKEN. It passes C I, because it's valid, it's just wrong. Push it. And you write down three times. When you pushed. When the deploy finished. And when the bad title actually shows up in your browser. And those last two can differ, because Pages has a C D N in front of it, a layer of caching servers, so you might need a hard refresh.

A: Then rollback by redeploy. Find the hash of the last good commit, go to the Actions tab, hit "Run workflow", and paste it in. Time from the click to the good title being back. Then push some small unrelated change to main. What does production show now?

B: It's broken again. Main still has the bad commit, so it just rebuilt it.

A: That's the trap from before, now on your own site. Then the second way. Git revert the bad commit, push, and time from push to fixed. And afterwards, write down which one you'd use at three in the morning, and why. And one sentence on what this pipeline can't roll back.

B: Anything that isn't in the repo.

A: Anything that isn't in the repo.

A: And there's an optional extra, if you'd rather serve the site from your own box over Tailscale, with base at the root. You add a second deploy job that joins your tailnet, the private network Tailscale sets up between your machines, using Tailscale's own action with an OAuth client and a tag for C I, and copies the artifact across. And the idea to get right is the layout on the server. Each deploy goes into its own folder, releases slash the commit hash. And the web server serves a symlink called current, a little pointer file that points at one of those folders. So deploying is "copy the folder, then repoint current". And rolling back is just "repoint current at the previous folder". Milliseconds. No build.

B: Same pointer trick a third time.

A: Same trick. And the one subtle thing is the flip has to be atomic. All at once. The obvious one-line command to replace a symlink actually deletes the old one and then creates the new one. So for a tiny moment, there's nothing there, and a request in that moment gets an error. The fix is, you create the new symlink under a temporary name, then rename it over the old one. A rename happens all at once. On Linux that's m v with the dash capital T flag. Keep the last five releases around. Put the S S H key and the Tailscale secrets in the repo's secrets, never in the yaml. And have an agent review the job for leaked secrets, and for what happens if the copy dies halfway.

A: So you're done when you can point at the blob, tree and commit files in your scratch repo, and your own cat file agrees with git's. When every push to main builds on a clean runner, runs the checker, and deploys, and every pull request builds and tests but doesn't deploy. When a pull request with a broken link shows red and can't merge. When the site loads at its real address with its styles, its lesson links and its figures all working. And when you've done the rollback drill both ways, with the times written down.

<!-- section: Measure -->

A: So what should the numbers look like? Locally, a full astro build of the site is about one second on an M-series Mac. When I ran it, it was under a second for sixty-five pages. On C I, these are rough expectations from GitHub's runners, not measurements, and they vary by day. Checkout and setting up Node, five to twenty seconds. N P M C I, ten to forty seconds, less once the cache is warm. Build plus your checker, a few seconds. The deploy job, ten seconds to a minute. Push to new version visible, one to three minutes.

B: [surprised] Wait, so the build is one second, and the whole thing is two or three minutes?

A: That's the first thing the numbers should tell you. Most of your pipeline's time isn't your build. Starting a runner, checking out, installing Node and your dependencies, that dwarfs a one-second Astro build. Which is totally normal. And it's why, for small projects, caching your dependencies matters way more than optimizing the build itself. For a big service, it flips. The build and the tests dominate, and that's when Fowler's ten-minute rule starts to bite.

A: Second. The broken-link pull request. Push to red check, about a minute. Compare that to the opening. Three weeks to find out about a mistake shaped like a renamed function or a missing file, versus one minute. On a machine that isn't yours. Before anyone else sees it. That ratio is the whole case for C I, in one number.

B: Three weeks against one minute. Yeah.

A: Third. The two rollbacks. Redeploy, one to two minutes from click to fixed. Revert, one to three minutes from push to fixed. They're close here, and that's misleading. It's only because the build is trivial. Multiply the build by twenty. A service with real tests, or a model with an eval gate that takes twenty minutes. And now redeploying an artifact you already have is the only rollback fast enough to use under pressure. And notice what was fast in both cases. Nobody had to build anything by hand. Which is exactly what Knight Capital didn't have.

A: And fourth. Those fifty-five broken links out of about eight hundred, that should be the most interesting number of all. Invisible in dev. Invisible to astro build, which passed. Only visible to a test that checked the site the way it's actually going to be served. "The build passes" and "the thing works" are two different claims. Good pipelines test the second one. Oh, and your scratch repo, three objects after the first commit, six after the second.

<!-- section: Break It -->

A: Then you break it, four ways. One. In a lesson, import that interactive figure with the wrong capitalization, all lowercase. Build locally. On a Mac, it builds without a single warning, because the Mac's default file system ignores case. The lesson checked that. Then push it. The Linux runner's file system cares about case, so the build should fail there. Worth checking yourself.

B: So my laptop isn't wrong, exactly.

A: It's not wrong. It's just not the machine your users get. That's the cleanest demonstration of why the clean machine exists. Two. Delete the lockfile and push. N P M C I flat out refuses to run without one. Now imagine C I used N P M install instead. It would happily grab the newest versions that match whatever range your package file allows, so for Astro, any seven point something from seven point four up. And one day, a new minor release of some dependency changes the build output, and there's no commit in your repo to blame. Lockfiles turn "same code" into "same bytes". So, put it back.

A: Three. Add a flaky test. Add a check to your link checker that just fails at random, twenty percent of the time. Push a few times.

B: [laughs] I already know what I'd do. I'd click re-run.

A: [laughs] Everybody does. And that's the real cost of flakiness. A check that's sometimes wrong for no reason trains everyone to ignore it. And then the day it's right, it misses the real failure. In M L, that's the eval gate with its threshold inside the noise. So take it out, and when you find a flaky test in real life, quarantine it, pull it out of the required checks until it's fixed, instead of living with it.

A: And four. Roll back something the pipeline doesn't own. Change a Pages setting by hand, or in a real service, run a database migration that drops a column. Then "roll back" by redeploying the previous commit. Nothing changes. Because that state was never in the repo. Rollback is only as complete as the part of your system that's described in version control. And that's the whole argument for keeping config in code, and for backward-compatible migrations.

<!-- section: Connections and close -->

A: This connects backwards to containers, by the way. A virtual machine fakes a whole computer, with its own operating system. A container just walls off a process on a shared operating system, with its own files. And a C I runner is a clean machine, and a container image is how you make "clean and identical" cheap, both for C I and for the artifact you deploy. And forwards to observability, logs, metrics and traces, because a pipeline tells you a change is safe to ship, and observability tells you whether it actually was. If you read just two things, read Fowler's article now and again after your next bad merge, and the Git Internals chapter of the free Pro Git book, which builds blobs and trees and commits by hand just like the first task.

B: [working it out] Okay, let me try the whole thing. Git is just a pile of snapshots named by their hashes, and branches are pointers. And C I is... running the tests on every push, on a clean machine, so you catch stuff before it gets to production.

A: [gently] Most of that. The git part's right. But C I isn't really "run tests on every push". You can do that on a three-week branch and still have merge day. It's merging into one main line at least every day, so work can't stay apart long, and then building and testing the combined code on a clean machine, so a mistake can't live long. It's the two clocks from the start. How long work stays apart, and how long a bug survives. Everything else, the artifacts, the flags, the rollbacks, the eval gate, it's all just ways of keeping both of those clocks short.
