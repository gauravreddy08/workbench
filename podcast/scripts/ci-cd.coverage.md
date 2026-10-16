# Coverage: ci-cd

Lesson src/lessons/ci-cd.mdx vs podcast/scripts/ci-cd.md. Item IDs match podcast/outlines/ci-cd.md.
"Fixed" = was MISSING or thin in the first draft and has been added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs: used git and Actions | Problem | "You know the commands." | covered |
| P1 three-week hard-negative branch, NDCG up two | Problem | "It's the hard-negative mining work for the cross-encoder" | covered |
| P2 teammate refactor, rename, tokenizer config | Problem | "They renamed the function your sampler calls" | covered |
| P3 fourteen conflicts, doesn't run, NDCG down, 140 commits, cached tokenizer | Problem | "a hundred and forty commits between the last state anyone knew was good" | covered |
| P4 not about commands; about time; shrink both | Problem | "Every one of those problems is about time." | covered |
| O1 integration hell | Origin | "Programmers had a name for it. Integration hell." | covered |
| O2 daily build, NT smoke test, McConnell 1996, silly hat | Origin | "wear a silly hat until someone else broke it" | covered |
| O3 Booch 1991, Beck XP | Origin | "Grady Booch used \"continuous integration\" back in nineteen ninety-one" | covered |
| O4 Fowler 2000/2006, CruiseControl 2001, Hudson/Jenkins, Travis 2011, Actions 2019 | Origin | "CruiseControl in two thousand one" | covered |
| O5 Humble and Farley 2010 | Origin | "make every green build releasable, automate the release" | covered |
| O6 Knight Capital, 8 servers, 45 min, ~460M | Origin | "about forty-five minutes the firm lost roughly four hundred and sixty million dollars" | covered |
| I1 three questions | Snapshots | "What does the project look like right now?" | covered |
| I2 SCCS 1972, RCS, CVS, Subversion 2000 | Snapshots | "S C C S at Bell Labs in nineteen seventy-two" | covered |
| O7 BitKeeper, April 2005, two weeks, key = hash of value | Snapshots | "He wrote the first version of git. In about two weeks." | covered |
| I3 content addressing | Snapshots | "Content addressing. Same content, same name. Always." | covered |
| I4 hash, 40 hex, SHA-1, collisions | Snapshots | "forty hex characters... S H A one" | covered |
| I5 blob, tree (with mode), commit; tags skipped | Snapshots | "Filenames live in trees, contents live in blobs." | covered |
| I6 snapshots not diffs, unchanged reused | Snapshots | B: "I always thought a commit was a diff" | covered |
| PR1 Predict: three not four, ce0136, 3 then 6 | Snapshots | "Three. Your list is right except for the blob." | covered |
| I7 branch = 41-byte file, HEAD, commit moves pointer | Snapshots | "A branch is a text file that's forty-one bytes long." | covered |
| F1 figure 001 described | Snapshots | "exactly one blob... with three arrows landing on it" | covered |
| I8 history can't be edited, blockchain, rebase new hashes | Snapshots | "same chain-of-hashes trick as a blockchain" | covered |
| I9 branches free vs CVS | Snapshots | "unthinkable in C V S" | covered |
| I10 every clone a full backup | Snapshots | "every clone is a full backup" | covered |
| I11 packfiles, gc, diff on demand | Snapshots | "a packfile... still snapshots" | covered |
| I12-I14 merge base, three-way, conflict, two parents | Merging | "the result is a commit with two parents" | covered |
| I15 1,000 files, 10/week, ~10% | Merging | "roughly a ten percent chance of a conflict" | covered |
| PR2 Predict four weeks ~80%, 8x, square, 9.4/81; 8 devs 28 pairs, ~3 and ~22 | Merging | "About eighty percent. Eight times likelier, not four." | covered |
| I16 people squared x lifetime squared; four times as often -> /16 each, total /4; fresher | Merging | "Each merge has about a sixteenth of the pain." | covered |
| I17 semantic conflict, build_features/featurize | Merging | "Your sampler called build features. Your teammate renamed it to featurize." | covered |
| F2 interactive figure, sliders, toy parameters | Big bang figure | "Six hundred files, a few hot ones... Two percent of edits carry a bug" | covered |
| F2a-c one dev, 2 to 12 devs, 2-5 days | Big bang figure | "Somewhere around every two to five days" | covered |
| I18-I22 cheap at write time; suspects, context, built on top, blast radius | Feedback loop | "For mechanical ones. First, more suspects." | covered |
| I23 Boehm 100x, Bossavit, direction vs multiplier | Feedback loop | "The Leprechauns of Software Engineering, by Laurent Bossavit" | covered |
| F3 detection ladder | Feedback loop | "Then C I on a clean machine. Roughly five to fifteen minutes" | covered |
| I24 CI is a practice | CI precisely | "That's the tool. Continuous integration is a practice." | covered |
| I25 Fowler habits incl ten minutes, revert | CI precisely | "Fowler's rule of thumb is about ten minutes." | covered |
| I26 pipeline, workflow, jobs/steps, runner, status check | CI precisely | "each job runs on a runner" | covered |
| I27 laptop lies: tokenizer, pip, case-insensitive | CI precisely | "Your laptop lies." | covered |
| I28 lockfile, same bytes | CI precisely | "records the exact version of every dependency" | covered |
| I29 npm ci vs install | CI precisely | "if your package file and the lockfile disagree, it fails" | covered |
| I30 delivery vs deployment; site is deployment | Continuous delivery | "They differ by exactly one human." | covered |
| I31 artifact, build once, ties to content addressing | Continuous delivery | "If you can name exactly what you tested, you can deploy exactly what you tested." | covered |
| I32 environments | Continuous delivery | "a preview, one per pull request... staging... production" | covered |
| F4 pipeline figure | Continuous delivery | "an artifact store holding versions forty, forty-one, and forty-two" | covered |
| I33 rollback as pointer, roll forward | Continuous delivery | "rolling back is moving the pointer to forty-one" | covered |
| I34 schema/data caveat, backward-compatible steps | Continuous delivery | "You add the new column. You deploy code that writes to both" | covered |
| PR3 Predict rollback: redeploy faster, main still bad, do both | Continuous delivery | "Redeploy the old artifact to stop the bleeding, then revert on main" | covered |
| I35 feature flags, merge day two | Continuous delivery | "Wait. So I could've merged on day two?" | covered |
| I36 Knight flag lesson, delete flags | Continuous delivery | "reuse the name of an old flag for some new behaviour" | covered |
| I37 trunk-based, Google monorepo, Potvin/Levenberg 2016, Accelerate | Continuous delivery | "faster delivery and fewer failures. Both at once." | covered |
| I38 branch protection / rulesets | Continuous delivery | "Without it, C I is advice." | covered |
| I39 code, data, weights; Sculley 2015 | ML | "The code, the data, and the weights." | covered |
| I40-I44 unit tests, data validation, eval gate, model artifact, shadow/canary | ML | "Wire it into the pipeline as a required check, and it becomes a gate nothing can skip." | covered |
| I45 noise ±0.01, 0.005 gate a coin flip, measure noise first | ML | "a gate that fails at a drop of zero point zero zero five is a coin flip" | covered |
| F5 ML pipeline figure | ML | "fail any gate, nothing ships" | covered |
| B1 two parts | Build: git | "you take git apart by hand" | covered |
| B2-B3 objects folder walkthrough, sub/b.txt, branch size | Build: git | "one file appears in the objects folder. Before any commit." | covered |
| B4 objcat: path split, zlib, header, SHA over header+body, trees binary | Build: git | "the S H A one runs over the header plus the body" | covered |
| B5 count-objects on Workbench | Build: git | "That's the entire history of the site, on your disk." | covered |
| B6-B7 project site base path, alternatives, Pages source, paid plan note | Build: pipeline | "Pages and branch protection on a private repo need a paid GitHub plan" | covered |
| B8 check_site.py behaviour | Build: pipeline | "A link that starts at the root but doesn't start with the base path is broken by definition." | covered |
| PR4 Predict: dozens, 55/808, base root 0, hand-written MDX links | Build: pipeline | "fifty-five broken links, out of eight hundred and eight internal ones" | covered |
| PR4a fix options, agent review cases | Build: pipeline | "Relative links... Or a tiny plugin... Or just deploy to a root." | covered |
| B9 workflow decisions | Build: pipeline | "no green build, no deploy" | covered |
| B10 rulesets and proving it | Build: pipeline | "watch the check go red and the merge button refuse" | covered |
| B11 rollback drill T0/T1/T2, CDN, both ways, what can't roll back | Build: drill | "Anything that isn't in the repo." | covered |
| B12 home server, releases/current symlink, atomic rename, keep five, secrets | Build: drill | "you create the new symlink under a temporary name, then rename it over the old one" | covered |
| B13 Done when | Build: drill | "So you're done when you can point at the blob, tree and commit files" | covered |
| M1 numbers table | Measure | "Push to new version visible, one to three minutes." | covered |
| M2 most time isn't the build | Measure | "Most of your pipeline's time isn't your build." | covered |
| M3 one minute vs three weeks | Measure | "That ratio is the whole case for C I, in one number." | covered |
| M4 rollbacks close, misleading, x20, Knight | Measure | "Multiply the build by twenty." | covered |
| M5 55 links most interesting | Measure | "\"The build passes\" and \"the thing works\" are two different claims." | covered |
| K1 wrong-case import | Break It | "import that interactive figure with the wrong capitalization" | covered |
| K2 delete lockfile, caret range | Break It | "any seven point something from seven point four up" | covered |
| K3 flaky test 20%, quarantine | Break It | "fails at random, twenty percent of the time" | covered |
| K4 roll back what pipeline doesn't own | Break It | "Because that state was never in the repo." | covered |
| E1 what git stores | Snapshots + close | "Git is just a pile of snapshots named by their hashes" | covered |
| E2 small merges reasoning | Merging | "pairs grow with the square of the team size" | covered |
| E3 CI/delivery/deployment, build once; rebuild risk | Continuous delivery | "a rebuild can quietly pick up a different dependency version" | fixed |
| E4 5 to 50: pairs, sharding, Bazel, merge queue, flaky, gradual deploys | Continuous delivery | "Five people is ten pairs. Fifty people is twelve hundred and twenty-five pairs." | covered |
| E5 cross-encoder pipeline incl "or on a schedule" | ML | "when their inputs change, or on a schedule" | covered |
| G1 Fowler, Pro Git ch. 10 | Close | "the Git Internals chapter of the free Pro Git book" | covered |
| C1 containers (re-explained), observability, statistics-for-evals, frozen eval set | Close / ML | "A container just walls off a process on a shared operating system" | fixed (frozen eval set line added) |

Numbers checked against the lesson: 14 files, 140 commits, two points / one point, 1972, 1991, 1996, 2000, 2001, 2005, 2006, 2010, 2011, 2012, 2015, 2016, 2019, 8 servers, ~45 min, ~$460M, 41 bytes, 40 hex chars, 1,000 files, 10 files/week, ~90% / ~10%, ~20% / ~80%, 9.4% / 81%, 28 pairs, ~3 / ~22, /16 and /4, 600 files, 2% bug rate, 2-5 days, 5-15 min CI, ~10 min rule, 3 / 6 objects, 55 / 808 links, Node 22 / 22.22, 1 s / 65 pages, CI timing ranges, 20-minute build, ±0.01 and 0.005, 500 queries, 1% canary, 20% flaky, 10 / 1,225 pairs, keep five releases. All match.

Derived in the script, not written in the lesson: "ten times ten is a hundred, forty times forty is sixteen hundred" (illustrating the lesson's k×k/1000); "each of my files has a four percent chance of being in your forty" (40/1000, implied by the lesson's 0.96^40).
