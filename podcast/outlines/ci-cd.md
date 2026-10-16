# Outline: ci-cd

Source: src/lessons/ci-cd.mdx. Curriculum entry: "Why every team has a pipeline." Question: what
problem do source control and CI/CD actually solve? Why: you know how to use them; this is why they
exist and what a good pipeline protects you from. Build: CI/CD for this very site, tests, build,
deploy on push, and a rollback.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: has used git and GitHub Actions; that's it. -> A, in passing in the opening ("you know the commands"). Today bullets skipped as a list; each is an item below.

## The Problem

- P1 Scene: three-week branch adding hard-negative mining to the cross-encoder (new sampler, feature pipeline change, loss tweak); locally passes, NDCG at ten up two points. -> A opens on it, first line. NDCG at ten glossed as "how good the top ten ranking is".
- P2 Meanwhile teammate refactored the feature pipeline, renamed the function the sampler calls, moved the tokenizer config. -> A.
- P3 Merge day: fourteen conflicting files, an afternoon guessing; merges but doesn't run (calls a function that no longer exists); fix; runs but NDCG down a point, nobody knows whose change, one hundred forty commits since last known-good; teammate's machine fails: cached tokenizer file only on your laptop. -> A, in sequence; B reacts with recognition.
- P4 None of it is about git commands; it's about time: how long work stays apart, how long a mistake lives. Source control and CI/CD shrink both. -> B voices wrong model first ("so the fix is learning rebase better / better merge tool"), A corrects to the time framing.

## Origin

- O1 1980s-early 90s: teams build parts separately for months, then an integration phase; took longer than building, unpredictable; "integration hell"; pieces worked, whole didn't, reasons buried. -> A as story.
- O2 Brute force fix: daily build; Microsoft daily build of Windows NT with smoke test; Steve McConnell wrote it up 1996, "Daily Build and Smoke Test", IEEE Software; break the build, fix it first; silly hat. -> A; B reacts to the hat.
- O3 Grady Booch used "continuous integration" 1991; Kent Beck's Extreme Programming later in the 90s made it a rule: integrate many times a day, run all tests every time. -> A.
- O4 Martin Fowler "Continuous Integration" 2000, revised 2006; ThoughtWorks built CruiseControl 2001, first popular CI server (machine watching the repo, building every change); Hudson 2005 renamed Jenkins 2011; Travis CI 2011 cloud for free; GitHub Actions 2019, same place as the code. -> A, quick timeline.
- O5 Question moves downstream: why is shipping still scary, manual, quarterly? Humble and Farley, Continuous Delivery, 2010: every green build releasable, automate release, do it so often it's boring. -> A.
- O6 Knight Capital, 1 August 2012: new trading code deployed by hand to eight servers, missed one, old feature flag woke dormant code; about forty-five minutes, roughly four hundred sixty million dollars lost; code wasn't the root problem, deploy process was. -> A tells it; B reacts; A holds the flag detail for later.

## The Idea: source control as snapshots

- I1 Three questions source control answers: what does the project look like now, at any past point, and how do several people change it at once without trampling. -> A.
- I2 History: SCCS at Bell Labs 1972, then RCS and CVS, one file at a time, chain of edits; Subversion 2000 whole-project versions but one central server; git took a different, simpler idea. -> A, brisk.
- O7 Origin 2005: Linux kernel used proprietary BitKeeper under free license; April 2005 license withdrawn after a dispute; Torvalds needed something for thousands of contributors, nothing free fast enough; wrote first git in about two weeks; core is tiny: key-value store where every key is the hash of its value. -> A.
- I3 Term content addressing: name data by a fingerprint computed from the data itself; same content, same name, always. -> A, intuition first then the name.
- I4 Term hash: fixed-size fingerprint (forty hex characters, SHA-1); change one bit, completely different; collisions practically impossible. Git stores bytes under the hash; the hash is the name. -> A; spelled "S H A one", "hex" explained as digits zero to nine plus a to f.
- I5 Three object kinds (plus tags, skipped): blob = one file's contents, just bytes, not even the filename; tree = one directory, list of names and hashes pointing to blobs and trees (plus mode); commit = one root tree (full snapshot), parent commit(s), author, time, message. -> A, one at a time; B asks where the filename lives (it's in the tree).
- I6 Commit stores the entire project, not what changed; looks expensive, content addressing makes it nearly free: unchanged file, same hash, new tree points at old blob; only changed things get new objects. -> B voices "git stores diffs" wrong model, A corrects.
- PR1 Predict same-content: a.txt "hello", commit; add sub/b.txt also "hello", commit; how many new objects? Three not four: new sub tree, new root tree, new commit; no new blob (same hash, ce013625...); measured 3 objects then 6. -> A asks, B guesses four, A reveals.
- I7 Term branch: a forty-one-byte text file holding a commit hash and a newline; making a branch writes one more such file; HEAD is a file saying which branch you're on; committing creates objects then moves the pointer. Nothing else. -> B voices "a branch is a copy of the code" wrong model, A corrects.
- F1 Figure 001: HEAD points at main; main and exp each a small file pointing at a commit; C2 points at parent C1; each commit points at a root tree; C2's tree has a.txt and sub; sub tree has b.txt; one hello blob with three pointers to it; every box is a file named by its own hash. -> A describes like a diagram over the phone.
- I8 Consequence 1: history can't be quietly edited; commit hash covers tree and parent hash, all the way down; change one byte in an old file, every hash above changes; same chain-of-hashes trick as a blockchain, fifteen years earlier, for something useful; why rebase gives new hashes (genuinely new commits). -> A; B connects rebase.
- I9 Consequence 2: branches are free (41 bytes); why git encouraged branching unthinkable in CVS where a branch meant copying history on a server. -> A.
- I10 Consequence 3: every clone is a full backup; GitHub holds one more copy; special to the team, not to git. -> A.
- I11 Packfile caveat: git gc packs objects into packfiles and delta-compresses similar ones; storage detail; model is still snapshots; git diff computes differences on demand by comparing two trees. -> B pushes back ("but I've heard it does store deltas"), A concedes and separates storage from model.

## The Idea: merging

- I12 Term merge base: last commit both sides share, where they split. -> A.
- I13 Term three-way merge: for each file compare base to main and base to B; one side changed a region, take it; both changed same region differently = conflict. -> A.
- I14 Term merge conflict: both changed the same part since split; git can't know which is right; human decides. Result is a commit with two parents. -> A.
- I15 Conflicts have arithmetic: 1,000 files, each dev touches about 10 different files a week at random; two devs on week-long branches; each of my 10 has 1% chance of being in your 10; no overlap about 0.99 to the tenth, about 0.90; about 10% chance of conflict. -> A works it in words.
- PR2 Predict four weeks (40 files each): 4x? 16x? Answer: about 80%, eight times, not four (0.96 to the fortieth about 0.20); overlap grows roughly with square of branch size when small (k times k over 1000), then saturates; simulation 9.4% and 81%. 8 devs: 28 pairs; one week about 3 colliding pairs per merge round; four weeks about 22. Pairs grow with square of team size; overlap with square of branch size; multiply. -> A asks, B guesses four times, A reveals.
- I16 Integration pain scales like people squared times branch lifetime squared per merge; merge four times as often: each merge about a sixteenth, four times as many merges, total drops about four; each conflict smaller and fresher (wrote it this morning). -> A.
- I17 Term semantic conflict: merges cleanly line by line, breaks when combined; build_features renamed featurize; different files, no textual overlap, clean merge, crash; only building and running combined code catches it; the whole argument for CI. -> A ties back to opening scene.
- F2 Figure 002 interactive: rows are developers, pale blocks unmerged work, orange circles on main merges with conflicts sized by edits to reconcile, orange lines bugs from written to caught at next merge; sliders developers, files per dev per day, big-bang interval; toy (600 files, a few hot ones, 2% of edits carry a bug, tests catch at next merge), shape honest. -> A describes what you'd see dragging the sliders.
- F2a One developer: no conflicts at any schedule; integration hell is a team problem; bugs still hide until a merge runs tests (feedback, not people). -> A.
- F2b Drag developers 2 to 12 with big bang: conflict work grows much faster than linearly, the N squared pairs. -> A.
- F2c Drag big-bang interval down: around every 2 to 5 days most pain gone; win is "short enough that branches can't drift far", not daily as magic. -> A; B: "so daily isn't the magic number".

## The Idea: feedback loop

- I18 Bug cheap when written (in your head, only suspect is last thing you typed); every hour it survives makes it more expensive, for mechanical reasons. -> A.
- I19 More suspects: one commit vs 140 commits, bisecting. -> A, links back to 140.
- I20 Lost context: forgot why, colleague on vacation. -> A.
- I21 Things built on top: other code, branches, a trained checkpoint, a report to your manager. -> A.
- I22 Blast radius: editor hurts you; production hurts users and maybe their data. -> A.
- I23 Boehm 1981 "100x more in production than design" chart; data from big 1970s projects; Laurent Bossavit's The Leprechauns of Software Engineering shows thin, mangled evidence; direction not in dispute, multiplier is; argue from mechanism. -> B cites the 100x number as their belief, A corrects.
- F3 Figure 003 ladder: editor/type check seconds, one line; local tests a minute, your last edit; CI on a clean machine about 5-15 minutes, one commit or PR; code review hours, one PR by eye; staging/big merge days, dozens of PRs; production days to weeks, everything; CI's job pulls detection up the ladder; rough orders of magnitude. -> A walks the rungs as a list said aloud; B notices CI isn't at the top.

## The Idea: CI precisely

- I24 Term continuous integration: practice not tool: everyone merges to shared main line at least daily, every merge automatically built and tested on a clean machine, broken build fixed first. -> B voices "CI is GitHub Actions, the thing that runs tests" wrong model; A corrects.
- I25 Fowler habits: one shared main line, merge often (weeks-long branches with CI = bought tool, skipped practice); automated, self-testing build, one command source to checked runnable thing; every change builds on separate clean machine; keep it fast, about ten minutes, slow builds get skipped/batched/ignored; red build fixed immediately, usually by revert not debugging on top. -> A.
- I26 Tool words: pipeline (sequence install, build, test, package, deploy, each must pass); workflow (YAML file in the dot github workflows folder: when to run, what jobs); jobs made of steps; runner (fresh VM, thrown away); status check (pass/fail on a commit; GitHub can block merge). -> A, quickly, each glossed.
- I27 Why clean machine: your laptop lies: cached tokenizer; package pip-installed by hand six months ago; macOS case-insensitive filesystem by default so importing Figure finds figure, Linux won't. "Works on my machine" is the default state of a used machine. -> A; B half-joking defends their laptop.
- I28 Fresh runner starts from what's in the repo: code, lockfile, workflow; passes there passes anywhere starting from the same things. Term lockfile: exact version of every dependency incl. dependencies of dependencies (package-lock, uv.lock, poetry.lock), same bytes. -> A.
- I29 npm ci vs npm install: ci installs exactly what lockfile says, fails if package.json and lockfile disagree, instead of quietly updating the lockfile. -> A.

## The Idea: continuous delivery

- I30 CI answers "does the combined code work"; next: how does it reach users. Continuous delivery: every green build releasable at a button, release automated, human decides when. Continuous deployment: every green build goes out automatically; the site will work this way. -> B mixes them up/asks the difference as a real confusion ("aren't those the same word?"), A splits them.
- I31 Build once, promote the artifact. Term artifact: packaged output (folder of static files, container image, wheel, model checkpoint), identified by version or hash, stored, deployed as is; dist folder for the site. Build once, test, deploy those exact bytes, not rebuild per stage. Same idea as content addressing. -> A ties to git hash.
- I32 Term environment: place it runs with own config and data: preview per PR, staging mimicking production, production; artifact moves unchanged, only config differs. -> A.
- F4 Figure 004: push/PR with commit SHA -> fresh runner box (thrown away) with install (npm ci), build (astro build), test (links, slugs), package (dist to artifact); red at test stops, nothing ships; preview per PR, staging same bytes, production pointing at artifact v42; artifact store v40 v41 v42; rollback = point prod at v41. -> A describes.
- I33 Term rollback: back to last known-good, ideally redeploy existing artifact; production as pointer to v42, rollback moves pointer to v41, seconds, no new code, what you want at 3am. Roll forward fine when fix obvious and pipeline fast, disaster when neither. -> A.
- I34 Caveat: rollback only undoes what the pipeline controls; schema change or bad data isn't un-written; backward-compatible steps: add new column, deploy code writing both, later drop old one. -> B assumes rollback undoes everything; A corrects.
- PR3 Predict rollback: revert and push vs redeploy previous artifact; which faster, which leaves main correct? Redeploy faster (skips install, build, test; small here, maybe a minute; for a 20-minute build it's the whole game); but main still has bad commit, next push redeploys it; revert slower but main and production agree; real teams do both: redeploy to stop bleeding, then revert. -> A asks, B picks redeploy and misses the trap, A reveals.
- I35 Term feature flag: switch read at run time from config; separates deploying from releasing; sampler merged day two behind a hard negatives flag defaulting off; integrated, nothing changes for users till flipped, flip back instant; makes daily merging possible for three-week work. -> A, ties to opening; B: "so I could have merged on day two".
- I36 Knight Capital as warning: flags are code; reused old flag name for new behaviour; a server still had old code that read it; nobody removed dead flags; delete flags when done. -> A, closes the origin story.
- I37 Term trunk-based development: one main branch, short-lived branches hours to a day or two, flags for unfinished work, not long-lived feature/release branches. Google: most code in one huge repo, single trunk, tens of thousands of engineers; Potvin and Levenberg CACM 2016. Accelerate (Forsgren, Humble, Kim, State of DevOps surveys): trunk-based habits and frequent deploys go with both faster delivery and fewer failures; kills fast-vs-careful trade-off. -> B voices "moving fast must cost safety", A corrects with Accelerate.
- I38 Term branch protection (rulesets / branch protection rules): no direct push to main, PR required, merge blocked until CI green; without it CI is advice; with it a red build physically can't reach production. -> A.

## The Idea: ML

- I39 Ordinary software: behaviour in code; ML: code, data, weights; code-only pipeline ships a model trained on broken data. Sculley et al. 2015 Hidden Technical Debt: model code a small box in a big diagram of data collection, feature extraction, configuration, monitoring; failures in the big diagram. -> A.
- I40 Unit tests on code: tokenizer pads, loss zero for perfect prediction, sampler never returns the positive as a negative; fast, every push. -> A.
- I41 Data validation: expected columns and types, null rates and label balance haven't jumped, no eval query in training set (leakage, beautiful meaningless number); run when data changes. -> A.
- I42 Eval gate: train/fine-tune or load candidate, run on frozen eval set, fail if metric drops past threshold vs current production model; NDCG at ten or MRR on fixed query set; where his validation harness lives; harness by hand = test suite run sometimes; wired as required check = gate nothing can skip. -> A, B recognises his own harness.
- I43 Model as artifact: checkpoint stored with its hash, producing commit, dataset version; deploy = point server at checkpoint ID; rollback = point back; same pointer trick. -> A.
- I44 Gradual release: shadow traffic (new model scores real queries, logged not shown) or canary (1% of traffic), watched before 100%; a feature flag for models. -> A.
- I45 Trap: eval metric noisy; NDCG at ten on 500 queries wobbling plus or minus 0.01 between seeds of the same model; gate at 0.005 drop is a coin flip; flaky gate trains team to re-run until green; measure noise first, threshold above it; statistics-for-evals lesson. -> B proposes a tight threshold, A corrects.
- F5 Figure 005: code, data, config inputs; unit tests every push, data validation (schema, nulls, leaks); into train/fine-tune; eval gate (NDCG at ten on frozen set, vs prod, above noise); pass -> model registry (checkpoint hash, commit, data version) -> shadow then canary 1% to 100% watched -> production pointing at checkpoint ID; fail any gate, nothing ships; cheap checks every push, expensive when inputs change. -> A describes.

## Build It

- B1 Two parts: take git apart by hand; then give this site its pipeline; by the end the lesson has been tested and deployed by the pipeline it describes. -> A.
- B2 Task 1: throwaway repo, watch objects folder: empty after init; one file after add, before any commit; cat-file on it says blob; after commit three files; print the commit (tree, author, message), print the tree (mode, type, hash, name); HEAD names a branch, branch names a commit. -> A, said as what you'd see.
- B3 Task 1 cont: add sub/b.txt, count again (checks prediction); make branch exp and look at the size of the file that is the branch. -> A.
- B4 objcat.py: own fifteen-line cat-file; objects at objects/first two hex chars/remaining thirty-eight; zlib-compressed; header "type space size", a zero byte, then body; hash_blob: SHA-1 over header plus body, not body alone; check against hash-object for hello; tree body is binary (names then twenty raw hash bytes), print raw and pick names, parsing properly is extra. -> A; B asks why header matters.
- B5 Last: count-objects and commit count in this Workbench repo: entire history on your disk, no GitHub needed. -> A.
- B6 Task 2: GitHub repo; Pages project site served from a sub-path (your name dot github dot io slash workbench); every URL must start with slash workbench or the browser asks for a path that doesn't exist; Astro's base option; layouts build links from base URL so setting base fixes them. -> A.
- B7 Alternatives keeping base at root: repo named your-name.github.io (user site), custom domain, home server over Tailscale; don't change lesson links yet, link checker about to tell you something; Settings Pages Source GitHub Actions; Pages and branch protection on private repo need paid plan, free on public. -> A.
- B8 Task 3: astro build passing proves MDX compiled, not that site works; check_site.py, standard library only, takes build folder and base path, exits non-zero on failure; collects every href/src and every id; resolve maps a link to file it should hit (skip external, mailto, pure fragment; base-prefixed folder link -> index.html; root-relative link not starting with base is broken by definition; relative links resolve against page folder); main: every slug in curriculum has its page, every internal link and fragment points at something real; prints BROKEN page link, summary, exit 1. Hints: slugs via a regex, trailing slash means index.html, set of ids per page. -> A explains by what it does.
- PR4 Predict broken links with base /workbench: zero, handful, dozens? Dozens: 55 of 808 internal (count changes as lessons added); base root found 0; layouts fine; every broken one hand-written in lesson MDX or the method page, root-relative Markdown links pass through as is, skip base; in dev base is effectively root so all works = how works-on-my-machine sneaks in. -> A asks, B says zero because the build passed, A reveals.
- PR4a Fix options: relative links, tiny remark plugin prefixing lesson links with base, or deploy to a root; what matters: checker runs every push. Agent reviews afterwards for query strings, src on images/scripts, percent-encoded paths. -> A.
- B9 Task 4 workflow: triggers push to main, pull requests (build and test, never deploy), manual run button with an optional commit to deploy (rollbacks); permissions: read contents, write pages, id-token to prove identity to Pages; build job on fresh Ubuntu: checkout (the given ref, empty = pushed commit), set up Node 22 with npm cache (astro 7 needs at least 22.22), npm ci, astro build, check_site, upload Pages artifact; deploy job: skipped on PRs, needs build (no green build no deploy), concurrency one deploy at a time letting running one finish, environment github-pages, deploy-pages. Check current action major versions; withastro/action alternative; writing steps out better for learning; push, watch Actions tab, note step times, open URL. -> A explains each decision, no YAML read.
- B10 Task 5 rulesets: target default branch; require PR, require status checks (build job, appears only after it has run once), block force pushes; bypass exists, notice it; prove: link to a nonexistent lesson on a branch, PR goes red, merge button refuses; fix, goes green; click the buttons yourself. -> A.
- B11 Task 6 rollback drill: change a lesson title in curriculum.ts to BROKEN; T0 push, T1 deploy finishes, T2 visible in browser (CDN lag, hard refresh); rollback by redeploy: find last good SHA, Run workflow with it, time; push an unrelated change, what does prod show (the Predict trap); rollback by revert, time; write which you'd use at 3am and why, and one sentence on what the pipeline can't roll back (anything not in the repo). -> A; B answers the "unrelated push" question naturally.
- B12 Task 7 optional home server over Tailscale: base root; second deploy job joins tailnet (Tailscale action with OAuth client and a ci tag), copies artifact; release layout releases/<sha> and current symlink; deploy = copy then repoint; rollback = repoint, milliseconds, no build; atomic flip: new symlink under temp name then rename over old (mv -T on Linux) because ln -sfn deletes then creates; keep last five releases; secrets in repo secrets, never YAML; agent reviews for leaked secrets and copy dying halfway. -> A, B asks why the delete-then-create matters.
- B13 Done when: point at blob, tree, commit files and objcat agrees with git; every push to main builds on clean runner, runs checker, deploys, PRs build and test only; broken-link PR red, unmergeable; site loads with CSS, links, figures; rollback drill done both ways with times. -> A, briefly folded into the Build close.

## Measure

- M1 Local astro build about 1 s on M-series Mac (under 1 s for 65 pages); CI checkout+setup-node 5-20 s; npm ci 10-40 s, less with warm cache; build + checker few seconds; deploy job 10-60 s; push to visible 1-3 min; broken-link PR push to red about 1 min; redeploy rollback 1-2 min; revert rollback 1-3 min; links about 800 / 55; objects 3 / 6. CI rows are rough expectations, not measurements, vary by day and queue. -> A says the important ones with comparisons.
- M2 Most pipeline time isn't your build: runner start, checkout, Node and deps dwarf a 1 s build; caching deps matters more than optimizing build for small projects; for big services build and tests dominate and ten-minute rule bites. -> B surprised, A explains.
- M3 Feedback in about a minute is the point: three weeks vs one minute, machine not yours, before anyone sees; that ratio is the case for CI in one number. -> A, ties to opening.
- M4 Two rollbacks close here, misleading: both a minute or two because build trivial; times twenty (20-minute service or eval gate) and redeploying existing artifact is the only rollback fast enough under pressure; in both cases no human built anything by hand, what Knight Capital didn't have. -> A.
- M5 55 broken links the most interesting row: invisible in dev, invisible in astro build which passed, only visible to a test checking the site as actually served; "build passes" vs "thing works" are different claims; good pipelines test the second. -> A.

## Break It

- K1 Wrong case import (pipelineintegration lower-case vs PipelineIntegration); local build on Mac fine without warning (macOS default filesystem ignores case); Linux runner case-sensitive so build should fail there (check yourself); cleanest demo why clean machine exists; laptop not wrong, just not the machine your users get. -> A "what if" exchange.
- K2 Delete lockfile: npm ci refuses; with npm install it'd resolve newest versions matching the caret range (anything seven point something from seven point four up), one day a new minor release changes build output with no commit to blame; lockfiles turn same code into same bytes; restore. -> A, B.
- K3 Flaky test: fails at random 20% of the time; push a few times; you stop reading red and click re-run; flaky check trains everyone to ignore it, then it misses real failure; in ML, the eval gate inside the noise; remove it, quarantine flaky tests. -> B admits they'd click re-run, A.
- K4 Roll back something pipeline doesn't own: Pages setting by hand, or migration dropping a column, then redeploy previous commit; nothing changes, state was never in the repo; rollback only as complete as what's in version control; argument for config-as-code and backward-compatible migrations. -> A.

## Explain It Back (model-answer content, folded in)

- E1 Git stores: key-value store keyed by SHA-1 of value; blob, tree, commit (root tree, parents, author, time, message); unchanged reused; branch = small file with a hash, HEAD says which branch; commit writes objects and moves pointer; chain of hashes means history can't change without changing every later hash. -> Snapshots section and B's restatement at end.
- E2 Small merges: overlap grows ~ square of change size, pairs ~ square of team; four weekly merges each about a sixteenth; fresher code; semantic conflicts caught early because CI builds combined code in minutes. -> Merging section.
- E3 CI vs delivery vs deployment definitions; build once and promote exact bytes so tested = shipped; rebuild risks different dependency or environment; old artifacts make rollback a pointer change. -> CD section.
- E4 Scale 5 to 50: pairs 10 to 1,225; trunk-based, small PRs, flags; tests grow past ten minutes: parallelise, shard, cache, run only affected tests (Bazel-like build systems know the dependency graph); many merges per hour: two PRs pass alone and break main together, so a merge queue tests each PR on top of latest main; flaky tests constant tax, track and quarantine; gradual deploys (canaries, flags), fast automatic rollback. -> Own exchange after trunk-based / Google, B asks "what breaks at fifty people".
- E5 CI/CD for the cross-encoder: unit tests every push; data validation on data change incl leakage; eval gate vs production above measured noise; checkpoint artifact with hash, commit, data version; shadow or canary watching online metrics; rollback = previous checkpoint ID; cheap every push, expensive when inputs change or on a schedule. -> ML section, with "or on a schedule" said.

## Go Deeper / Connections

- G1 Fowler's article (read now and after a bad merge); Pro Git chapter ten, Git Internals (companion to Task 1). -> One closing sentence by A.
- C1 Containers lesson: runner is a clean machine, container image makes clean and identical cheap; observability: pipeline says safe to ship, observability says whether it was; statistics-for-evals for threshold; why-evals-are-separate for frozen set; home server tunnel in ssh-and-tailscale. -> A, one or two sentences near the close; containers re-explained briefly since he's fuzzy on it.

## Flow

Problem scene -> B's wrong "it's a git skills problem" -> time framing -> Origin (integration hell to Knight Capital, flag detail held) -> snapshots (BitKeeper origin, content addressing, objects, diffs wrong model, Predict, branch wrong model, figure, consequences, packfiles) -> merging (terms, arithmetic, Predict, scaling, semantic conflict, interactive figure) -> feedback loop (mechanisms, Boehm myth, ladder) -> CI precisely (practice not tool, habits, words, clean machine, lockfile) -> CD (two CDs, artifact, environments, pipeline figure, rollback, Predict, schema caveat, flags + Knight Capital payoff, trunk-based + Accelerate, scale question E4, branch protection) -> ML (three things, five gates, noise trap, figure) -> Build It (git guts, base path, checker + Predict, workflow, rulesets, drill, home server) -> Measure -> Break It -> Connections -> ending: B restates, A sharpens (time: work apart, mistakes alive).
