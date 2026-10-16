<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture your cross-encoder. It's been training for nine hours. And every thousand steps it calls torch dot save, model state dict, into a file called ckpt dot P T. Then, at step thirty-seven thousand, something happens. The job gets preempted. Or the Spark loses power. Or you hit control C twice in the wrong terminal, which, honestly, is the most likely one. No big deal, right? You restart from the checkpoint. And you get this error. Runtime error, Pytorch stream reader failed reading zip archive, failed finding central directory.

B: [a bit unsure] Okay, but... that's the new checkpoint that's broken, right? The one it was in the middle of writing. The old one, step thirty-six thousand, that was fine a second ago. That should still be sitting there.

A: [sighs] That's the natural thing to think. And it's wrong in the worst possible way. There was only ever one file. One file called ckpt dot P T. The save that was in flight when the job died was writing over it. It got halfway. So step thirty-six thousand is gone, because it got overwritten, and step thirty-seven thousand never finished. Nine hours. Back to zero.

B: Oof.

A: So that's the scary half. There's a puzzling half too. You load an eight billion parameter model from safetensors, and it "loads" in forty milliseconds. Which is impossible.

B: [working it out] Eight billion parameters at two bytes each is, what, sixteen gigabytes. And a fast SSD does... seven gigabytes a second, maybe? So that's over two seconds. Minimum.

A: Over two seconds, minimum. And yet, forty milliseconds. Then it gets weirder. You load it again in a fresh process and the first forward pass is fast. But Monday morning, same load, same file, it's slow again. And when you use torch dot load on a dot P T file instead, it takes about twice the RAM you expected. And here's the thing. Both halves, the broken checkpoint and the impossible load, have the same root. Between your Python code calling write and the bytes actually being on the flash chips, there are four layers of memory. Each one's owned by someone different. And each one lies to the layer above it a little bit. And those same four layers, running backwards, decide how fast a model loads. Once you can see them, the checkpoint bug is just... obvious. And so is the forty millisecond load.

<!-- section: Origin -->

A: This has a nice bit of history, actually. Early two thousand nine. Ubuntu users are testing the new ext four filesystem, and they start losing files after crashes. And not old files. Config files. Files that KDE and GNOME, the desktop environments, had just rewritten. After a reboot the files were there, with the right name... and zero bytes long.

B: Just empty?

A: Just empty. And the programs were doing the classic thing. Write the new contents to config dot temp, then rename config dot temp to config. And on the old filesystem, ext three, that happened to be safe, because ext three wrote the file's data to disk before it recorded the rename. But ext four had a new optimization. When you write new data, the filesystem waits, often thirty seconds or more, before it even decides where on the disk to put it. That way it can group a bunch of writes into big contiguous chunks. That's called delayed allocation. And it meant the data sat in memory for longer. So the rename, which is a tiny change to the filesystem's bookkeeping, could reach the disk first. Crash in that window, and you get the new name pointing at a file with no data.

B: So whose bug was that? The filesystem's or the apps'?

A: [amused] So that was the fight. Ted Ts'o, who maintains ext four, pointed out that the standard, posix, never promised the old behaviour. If you want data on disk, you call F sync. The applications were relying on luck. And he was right. And then he also added a heuristic to ext four that forces the data out before that kind of rename anyway. Because millions of programs were never going to get fixed.

B: Right and fixed it anyway. Fair.

A: And a few years later, in twenty fourteen, some researchers, Pillai and others, took a dozen popular programs, including databases and version control systems, and tested them against crashes. They found crash bugs of exactly this kind in almost all of them. So, saving a file correctly is genuinely hard. Nearly everyone gets it wrong the first time. Which is a nice thing to know before we start.

<!-- section: The Idea: a file is a name, a number and some blocks -->

A: [relaxed, thinking out loud] So, start with what a file even is. On disk, a filesystem keeps three separate things. First, the data. The actual bytes. They're stored in fixed-size chunks called blocks, usually four kilobytes each. So a ten kilobyte file takes three blocks. And those blocks can be scattered wherever there happened to be free space. Second, there's a record that says where those blocks are. Plus the file's size, who owns it, permissions, timestamps. That record is called an I node. It's basically everything about the file... except its name.

B: So where does the name live?

A: In the directory. That's the third thing. A directory entry is just a line that says, the name ckpt dot P T means I node number eight eight one two. And a directory is itself a little file whose contents are a list of those name to I node pairs.

B: [working it out] Okay. So when I rename a big file, the filesystem has to, like, shuffle the data into a new entry—

A: [jumping in] No, and that's the whole trick. Nothing moves. The name and the data are separate on purpose. Renaming a file only rewrites one directory entry. It doesn't move a single byte of data. That's why renaming a thirty gigabyte file is instant. Hold on to that, because it's what makes safe saving possible later.

B: Huh. Okay.

A: Now, your program never touches any of this directly. There's one program on the machine allowed to talk to the hardware, and that's the kernel. The core of the operating system. Everything else has to ask it. And the way you ask is a system call. Syscall for short. Your program says "open this file" or "write these bytes", the CPU switches into a privileged mode, the kernel does the work, and it switches back. So when you call open on ckpt dot P T for writing, the kernel finds the I node or creates one, sets up a little record of the open file, which file it is, where you are in it, whether you're allowed to write, and hands you back a small integer. That's the file descriptor. You've seen them before with processes. Zero, one and two are always standard in, standard out and standard error. So your first file is usually three. And every later write, read and close, you just pass that number.

A: If you drew it, there's a line down the middle. On the left, your process. All it holds is a little table, zero, one, two, three, where three says ckpt dot P T. That's it. That's all you've got. Everything else is on the right, the kernel side. The open-file record, saying position zero, mode write. That points at I node eight eight one two, which has the size and owner and the block list, say blocks ninety-one, ninety-two, and five seventeen. And separately, up top, the directory, with the line ckpt dot P T, arrow, eight eight one two. And a rename only touches that one directory line.

B: And crossing that line in the middle costs something?

A: It does. The CPU switches modes, the kernel checks your arguments, does the work, switches back. On the M four Pro MacBook the lesson was written on, an unbuffered one byte write from Python costs about one point eight microseconds. Most of that's the syscall and Python's own overhead. Compare that to just appending a byte to a buffer in your own memory, which is about forty nanoseconds. So the syscall is, I mean, it's something like forty-five times more expensive for the same byte. And that's exactly why the first layer exists.

<!-- section: Layer 1: the buffer inside your process -->

A: So, layer one. When you call f dot write on a file you opened in binary mode, Python doesn't make a syscall at all. It copies your bytes into a buffer inside your own process. A buffer's just a chunk of memory where data collects before it's sent on, so lots of little writes turn into one big one. Only when that buffer fills up, and on Python three fourteen the default is a hundred twenty-eight kilobytes, older versions used eight, or when you call flush or close, does Python make one real write syscall with the whole chunk.

B: So right after f dot write returns, my bytes are... where, exactly?

A: In your process's own RAM. Nowhere else. If the process dies right then, they die with it. And torch dot save writes through a buffer like this too.

<!-- section: Layer 2: the page cache -->

A: Okay, layer two. Python finally calls the write syscall. File descriptor three, here's a hundred twenty-eight kilobytes. What does the kernel do? It does not wait for the SSD. It copies your bytes into what's called the page cache. That's the kernel's own copy of file data, kept in RAM that nobody else is using. It marks those pages dirty, which just means changed in memory and not yet written to the disk. And then it returns. Write succeeded.

B: [casual] Okay, so that's the point where it's saved. Write said success.

A: [gently] That's the thing almost everybody believes, and it's the single most important thing to unlearn here. Write returning success means "the kernel has a copy". It doesn't mean "it's on disk". Your bytes are still only in RAM. It's just the kernel's RAM now instead of yours.

B: So when does it actually go to the disk?

A: Later. In the background. The kernel has a job called writeback that writes dirty pages out to the drive whenever it gets around to it. On Linux the defaults aim to write a dirty page within roughly thirty seconds. There's a setting for that, dirty expire centisecs, and on a typical install it's three thousand, which is thirty seconds in hundredths of a second. Check yours. And it'll go sooner if a lot of memory is dirty.

B: [skeptical] Why would the OS lie to me like that, though?

A: Because it makes almost everything faster. Writes come back in microseconds instead of waiting on a drive. If you write the same block ten times, only the last version ever goes to the drive. Small writes get merged into big ones, which the drive really likes, we'll get to why. And if you read a file you just wrote, it comes straight from RAM. A clean page, by the way, one that matches what's on disk, can be thrown away any time the kernel wants the memory back. A dirty one has to be written first.

B: Okay, but then if I kill the process, kill dash nine, the hard kill, anything that hasn't hit the disk yet is gone.

A: And that's the surprise. No. The page cache belongs to the kernel, not to you. So if your process gets killed, the data that already made it into the page cache survives. The kernel keeps it, and writes it back as if nothing happened. Kill dash nine can only destroy what's still inside the process, which is that Python buffer. A power cut is a different story. The page cache is RAM, and RAM forgets everything the moment the power goes.

B: [working it out] So, kill the process, you lose layer one. Kill the power, you lose... everything that's in RAM anywhere.

A: Everything in RAM anywhere. And there's more RAM further down than you'd think.

<!-- section: Layers 3 and 4: the drive's cache, then the flash -->

A: Because even when the kernel sends your pages to the SSD, it's not done. Most SSDs have a small amount of their own DRAM, their own little memory, and they may say "got it" as soon as your data lands there, before it's actually been written into the flash cells. And that DRAM is volatile too. Expensive datacenter drives carry capacitors, basically little batteries, that hold enough charge to finish writing that cache to flash if the power suddenly goes. That's called power-loss protection. Consumer drives usually don't have it.

B: So four places. My buffer, the kernel's page cache, the drive's cache, and the flash.

A: [thoughtful] Four places your bytes can be. And only the last one survives a power cut. Now, there's an interactive picture of this that's worth describing. Four rows stacked top to bottom. Python buffer, which is your process, RAM. Page cache, kernel, RAM. Drive cache, SSD DRAM, volatile. And at the bottom, nand flash, durable. Then a row of buttons. f dot write, flush, F sync, a Mac-only one called F full F sync, wait, kill dash nine, and power cut. And a switch between Linux and macOS. Every chunk you write shows up as a little letter. A hollow blue box means a dirty copy that only lives in RAM. A grey one means a clean cached copy. Solid blue means it's on flash.

A: So try a few things. Write three chunks. The buffer holds three, so when it fills, Python makes one write syscall for you, and all three drop into the page cache row. Now hit kill dash nine. The process is gone. But the three chunks are still sitting in the page cache. Press wait, and you watch them slide down, through the drive cache, onto flash. The dead process's data still reaches the disk.

B: Okay, that's kind of eerie.

A: [amused] It is a bit. Now reset and write just one chunk, then kill dash nine. That chunk was still in the Python buffer. Gone. Even though f dot write returned. Next one: write, flush, then power cut. Write said success, flush did its syscall, and you lost everything anyway, because it was all still in RAM.

B: What if I write two chunks and then call F sync? Without flushing.

A: That's the sneaky one. F sync only covers what the kernel has. It can't see inside Python's buffer at all. So those two chunks are still sitting in your process and F sync happily returns. You have to call flush first, then F sync.

<!-- section: fsync: the only promise you get -->

A: So let's talk about F sync properly, because it's the one promise you actually get. F sync is the call that turns "the kernel has a copy" into "it's on the disk". It blocks. It doesn't return until the kernel has written every dirty page of that file to the drive, and the drive has said the data's stable. On Linux that includes sending the drive a "flush your own cache" command. And only when F sync comes back without an error is your data durable. Durable meaning it'll survive a crash or a power loss. It's the D in a database's ACID guarantees.

A: It's got a cousin, F data sync, which skips metadata you don't need to read the data back, like the last-modified time. That can save a write. Linux has it. macOS doesn't expose it in Python. And there are flags you can pass when you open a file, O sync and O D sync, that make every single write behave as if it was followed by an F sync.

B: And what does all that cost? Like in actual time.

A: So this depends enormously on the drive and the OS. On that M four Pro MacBook, with Apple's filesystem, A P F S, on the internal SSD, writing a thousand blocks of four kilobytes each. A plain write, no F sync, is about four microseconds each. Write plus F sync, about thirty-five to forty microseconds. So roughly ten times slower. And then write plus that Mac-only F full F sync... about three point nine milliseconds.

B: [surprised] Milliseconds? That's like... a thousand times the plain write.

A: About a thousand times. And that Mac row is a real gotcha. On macOS, plain F sync sends your data to the drive, but it doesn't tell the drive to flush its own cache. It stops at the drive cache row in that picture. Apple's own man page says so. And they provide a separate call, an F control command called F full F sync, that goes all the way to flash. That's the expensive one. Databases like SQLite use it on macOS when you ask them to be fully durable. But Python's O S dot F sync on a Mac calls the plain one.

B: [skeptical] So the Mac's F sync is just... faster because it's not actually doing the job.

A: Pretty much, yeah. It's doing part of the job. On Linux, F sync does include the cache flush, on any normal filesystem setup, so Linux F sync is the honest one. And what it costs ranges a lot. Somewhere from tens of microseconds, on a datacenter NVMe drive with power-loss protection, because that drive can safely say "got it" from its cache, the capacitors have it covered, all the way up to several milliseconds on a consumer drive that really has to program the flash. You'll measure what the Spark does.

<!-- section: Predict: fsync cost -->

A: So try this. A training job saves a two gigabyte checkpoint every ten minutes. You add one F sync at the end of each save. Roughly how much does that slow training down?

B: [a bit unsure] I mean, F sync is the thousand times slower thing. So... a lot? Ten percent?

A: Almost nothing. Here's why. One F sync of two gigabytes costs about as long as actually writing two gigabytes to the SSD. Call it half a second to a second, at a few gigabytes a second. And you pay it once every ten minutes. That's under a fifth of a percent of training time. Those bytes had to get to the drive eventually anyway. F sync just makes you wait for it, once.

B: Okay.

A: Now a different job. A logger that writes one two hundred byte line per training step, at fifty steps a second, and calls F sync after every line. Say a consumer SSD, about three milliseconds per F sync. How much of every second goes to F sync?

B: [working it out] Fifty times three milliseconds... a hundred fifty milliseconds. Out of every second. For two hundred byte lines.

A: [matter-of-fact] Fifteen percent of your step loop, waiting on tiny writes. Because F sync's cost is mostly per call, not per byte. It's a round trip to the device plus a cache flush, whether you wrote two hundred bytes or two gigabytes. So many small F syncs is the expensive pattern. The fix is to batch. F sync every N lines, or once a second, and just decide up front how many log lines you're willing to lose.

<!-- section: Saving a file so no crash can break it -->

A: Okay, back to the broken checkpoint. Here's what actually happened. Torch dot save opens the file in write binary mode. And opening a file that way truncates it. Cuts it down to zero bytes, right then, throwing away the old contents. Then it spends the next few seconds writing the new checkpoint. Any crash in that window, even a plain kill dash nine, leaves you with half a file, and no old one.

B: And kill dash nine is enough? Even with the page cache surviving?

A: Even then. Because the page cache faithfully keeps the half that was written. It's just that half isn't useful. The lesson's author actually did this. A one gigabyte checkpoint on the Mac, killed a hundred fifty milliseconds into the save. The file was two hundred sixty-four megabytes. And torch dot load failed with that exact "central directory" error. Because a dot P T file is a zip archive, and a zip keeps its index at the very end. The part that was never written.

B: So the fix is... don't write over the real file.

A: Don't write over the real file. And this is where the rename trick comes back. Posix promises that renaming onto an existing name is atomic. Atomic means it happens all at once or not at all, there's no in-between state anyone can see. So anyone who opens that name gets the old file or the new file. Never a mix. So the safe recipe has four steps.

A: One. Write the new checkpoint to a temporary file in the same directory. Ckpt dot P T dot temp. Same directory matters, because rename is only atomic within one filesystem. Two. Flush, then F sync that temp file. Now the new data is durable, it's really on flash, but it doesn't have the official name yet. Three. O S dot replace, temp file onto the real name. That's Python's spelling of rename that overwrites on every OS. Now the name points at the new data, in one step. Four. Open the directory itself, and F sync it.

B: [skeptical] F sync a directory? You can do that?

A: [amused] You can, and you have to. Because remember, the rename is a change to the directory's contents. That little list of names. And like any change, it sits in the page cache until it's written out. So without step four, a power cut right after step three can bring you back up with the old name. Step two is the one the two thousand nine programs skipped. Step four is the one almost everyone skips.

A: And there's another interactive figure for this one, which is kind of the payoff. Three recipes you can switch between. Write in place, the naive torch dot save. Temp file plus rename, with no F syncs. And the full recipe. Then a slider for where the crash happens, step by step through the recipe, and a toggle for kill dash nine or power cut. And underneath, what you'd find after a restart.

A: Write in place, with kill dash nine. Slide to right after the open: the file's empty, zero bytes, the old checkpoint destroyed before a single new byte existed. Slide a bit further, half written: torn, half new, no zip index. Slide to where torch dot save has made every write call but the last chunk's still in Python's buffer: tail missing. Only once close has flushed everything do you get a good new file. Switch to power cut and every step before writeback finishes says unknown. Could be old, empty, torn, anything. And even when it comes out fine, that's lucky timing. You never called F sync.

A: Now temp plus rename. Kill dash nine at any step, you're fine. The real name was never touched until the rename, and the rename swaps it in one step. But switch to power cut and put the crash right after the rename. And you get "maybe broken: new name, missing data". Because the rename is a tiny metadata change and the data's big and still in the page cache. Exactly the ext four story.

B: And the full recipe?

A: Safe at every point. The worst case is you wake up on the old checkpoint, whole. Between the F sync and the rename there's this nice state where the new data is complete and durable but has no name. Crash then, and the old one's still official. Crash after the rename but before the directory F sync, and you might get old or new, but both are whole, because the data was F synced first.

B: [working it out] So the pattern is, against kill dash nine, rename alone is enough, because the page cache outlives the process. And against power loss you need the F syncs, because the page cache doesn't outlive the power.

A: That's it exactly. And real training jobs die both ways. Preemption and the OOM killer, when the kernel kills your process for using too much memory, those are like kill dash nine. A node losing power, or a kernel panic, those are like a power cut. So you want the recipe that survives both. Two more practical things. On startup, delete any leftover temp files. And a lot of training setups keep the last two or three checkpoints, not just one. Because the recipe protects you from crashes, but it doesn't protect you from a bug that cleanly writes a garbage checkpoint.

<!-- section: Underneath: what the filesystem does about crashes -->

A: Now, one layer down. What does the filesystem itself do about crashes? Because a single write that grows a file changes several things on disk. The data blocks. The I node, which gets a new size and a new block list. And a bitmap, which is the filesystem's record of which blocks are free. A crash halfway through could leave the I node pointing at blocks that the bitmap also says are free. And now it's not your file that's corrupted, it's the filesystem. Somebody else's file could get written on top of yours. In the old days the fix was a program called F S C K, file system check, that scanned the entire disk after every crash. On big disks that took hours.

B: Hours, every time it crashed.

A: Every time. So modern filesystems use a journal. It's a reserved area of the disk where the filesystem first writes down what it's about to change. Databases have the same idea and call it a write-ahead log. Describe the change, make that description durable, and only then make the change for real. The journal goes in four steps. First, log it. "I'm about to change this I node and this bitmap." Second, commit. One small record, flushed to disk. That's the line in the sand. Third, apply. Write the real I node and bitmap in their real places. Fourth, free. That journal space can be reused.

A: And the crash cases are all simple. Crash before the commit record lands, and on the next mount the journal entry has no commit, so it's ignored. As if it never started. Crash anywhere after the commit, and on mount the committed entries get replayed, finishing the change.

B: What if it crashes during the replay?

A: Then it replays again next time. And replaying twice is harmless. It's writing the same values to the same places. So either way the filesystem comes back consistent. But, and this is the part that matters for you, your file's data is a separate question.

B: [a bit unsure] Wait, but ext four is a journaling filesystem. So my checkpoint's protected, isn't it?

A: [jumping in] That's the trap. Most journals cover metadata, not your data. Ext four's default mode, called data ordered, journals the I nodes, the bitmaps, the directories. And it makes sure a file's data blocks are written before the metadata that points to them gets committed. But it doesn't journal the contents of your checkpoint. The journal keeps the filesystem from being corrupted. It doesn't keep your file from being half-written. That's still your job, with the four-step recipe.

A: Some filesystems don't journal at all, though. They copy. Apple's A P F S, and Btrfs and ZFS on Linux, are copy-on-write. They never overwrite a block in place. They write the new version somewhere free, and then atomically switch one pointer to it. Which is, if you think about it, your temp-and-rename trick, built into the filesystem at the block level. The Spark's root filesystem is ext four on a standard D G X OS install, you can check with D F dash capital T. And your Mac is A P F S.

<!-- section: What an SSD actually does with a write -->

A: Okay. One more layer down. The SSD itself. From the latency lesson you know an SSD is made of nand flash. Each cell traps a little electric charge that stays put without power. Reading senses the charge. Writing pushes charge in. And only erasing can take it out. And you know a random four kilobyte read takes tens of microseconds, and that the drive has a small computer inside. Here's why it needs one. Flash has three awkward rules.

A: Rule one. You read and write in pages. A page is a few kilobytes, up to about sixteen. Rule two. You can only write to a page that's empty. You can't overwrite a page in place. And writing, which for flash is called programming, is slow. Roughly hundreds of microseconds to a couple of milliseconds per page. Several times longer than a read. Rule three. You can only empty pages a whole block at a time. And a block is hundreds of pages, several megabytes. An erase takes milliseconds. And every block only survives a limited number of erases, on the order of a thousand or a few thousand for common consumer flash, before it wears out.

B: [skeptical] Hang on. If you can't overwrite a page, how does the disk let me overwrite anything? I overwrite files all the time.

A: [laughs] It cheats. When the filesystem says "overwrite block seven", the drive can't. So its firmware, called the flash translation layer, F T L, writes your new data to any empty page it's got, updates a map, "address seven now lives at block two, page five", and marks the old page as stale. So the computer sees an ordinary disk where you can overwrite anything. And underneath, nothing is ever overwritten.

A: Picture it as a map on the left, sitting in the drive's DRAM. Address three, block zero page two. Address seven, block one page two. And a note: address seven used to be block zero page one, now stale. On the right, three blocks. Block zero is full, but most of its pages are crossed out, stale, with only three live ones left. Block one is filling up. Block two has been erased, totally empty, ready to write.

A: And eventually the drive runs low on empty pages. Then garbage collection kicks in. It finds a block that's mostly stale, like that block zero, copies its few live pages somewhere else, and erases the whole block. So it copies three live pages out, then erases block zero. And those copies? Those are writes you never asked for. The ratio of bytes the drive actually writes to flash, over the bytes you sent it, is called write amplification. One point oh is perfect. And it eats both speed and the drive's lifespan.

B: [working it out] So that's why the order I write things in matters to the drive.

A: That's exactly why. Big sequential writes are the drive's favourite. They fill whole blocks with data that tends to become stale together. Like, you'll overwrite or delete the whole file later. So when garbage collection comes around, it finds blocks that are entirely stale, and erases them without copying anything. A checkpoint is the ideal write. Small random overwrites are the worst. Each one strands one stale page in some different block. Live and stale data end up mixed everywhere, and every erase drags a bunch of copies along with it.

A: And a full drive is slower. With less free space, garbage collection has fewer good blocks to pick from, so it has to copy more for every block it frees. Leaving free space keeps writes fast.

B: What about deleting a file? Does the drive find out?

A: Not by itself. Deleting just updates the filesystem's bookkeeping. The drive still thinks those pages hold live data and will dutifully copy them around during garbage collection. Unless the OS tells it. There's a command for that called trim. "These addresses don't hold anything useful anymore." Then the drive can treat those pages as stale. Modern OSes do it automatically, or on a schedule.

<!-- section: Sequential vs random, one more time -->

A: One more thing from the latency lesson. A random four kilobyte read is about fifty to a hundred microseconds. But the same drive does several gigabytes a second if you give it big requests, or lots of requests at once. Reads and writes both behave that way. And the page cache adds its own help on top. When the kernel sees you reading a file front to back, it starts fetching the next chunk before you even ask. That's readahead. So sequential reads of a cold file get close to the drive's peak. On the Mac, reading a cold two hundred sixty-nine megabyte model file with big read calls ran at about six point six gigabytes a second. Reading it again warm, straight from the page cache, ran at about seventeen. Which is just memory copy speed.

B: So that's two and a half times faster, just from it already being in RAM.

A: Just from it already being cached. And that's the bridge to loading models.

<!-- section: Reading a file two ways: read() and mmap -->

A: There are two ways to get a file's bytes into your program. The first is read. You ask the kernel to copy bytes from the page cache into a buffer you own. If the pages aren't cached, the kernel reads them from the drive first. Either way, you end up with two copies in RAM. One in the page cache, which is the kernel's, clean, and droppable. And one in your buffer, which is yours, and private.

A: The second way is M map. Quick reminder from the virtual memory lesson. Every process sees its own private range of addresses, its virtual address space, and each page of that range can be backed by real RAM, by a file, or by nothing yet. M map asks the kernel to make a chunk of your address space be the file. And no data moves at that moment. The kernel just writes down that those addresses are backed by this file. Then the first time you actually touch one of those addresses, the CPU finds nothing mapped there, and it traps into the kernel. That's a page fault. And the kernel handles it by pointing that address at the page-cache page holding that part of the file, reading it from the drive first if it has to. Then your code just carries on like nothing happened.

B: So there's no second copy.

A: One copy. The page cache is your data. Nothing gets copied into your heap. And that changes three things. First, loading becomes instant. M map of a sixteen gigabyte file returns in microseconds, because it hasn't done anything yet. The cost moves to first touch, and gets spread out across the forward pass.

B: [amused] Oh. So that's the forty milliseconds.

A: That's your forty milliseconds. Second thing, several processes share one copy. Two inference workers that M map the same weights file both point at the same page-cache pages. With read, each gets its own private copy. And third, it's gentler when memory's tight. Mapped file pages are clean copies of what's on disk. So under pressure the kernel can just drop them and read them again later. A private copy you made with read has to be kept, or swapped out, which means writing it somewhere first.

B: So M map is basically just the faster way to read a file.

A: [gently] It's tempting to put it that way, but no. There's a cost. M map turns one big, efficient sequential read into lots of small page faults. Each one's a trip into the kernel. When everything's already cached, those faults are cheap. When nothing's cached, they can be slower than one big read. Because now the drive's getting a trickle of small requests instead of a few huge ones. And you'll measure exactly that.

<!-- section: torch.load vs safetensors -->

A: Now the ML part. Which is really just those two ideas wearing different clothes. A dot P T file is a zip archive. You can open one with unzip and list it. Inside there's a file called data dot P K L. That's a pickle. Pickle is Python's format for turning objects into bytes and back. And unpickling works by running instructions stored in the file. That pickle describes the structure: a dictionary of names to tensors, with each one's dtype, its shape, and which storage holds its bytes. And then there's one entry per storage, data slash zero, data slash one, and so on, holding the raw bytes. Torch dot load unpickles the structure, and then, for each storage, allocates memory and copies the bytes in. So you get the page cache copy, plus your own copy.

A: And pickle has a second problem. Those instructions can call any Python function. So a pickle can say, "to rebuild this object, call O S dot system with this string." And a normal unpickler will just do it.

B: [surprised] Wait. So loading someone's checkpoint was running their code?

A: For years, loading a dot P T file from a stranger was the same as running their script. Since PyTorch two point six, torch dot load defaults to weights only equals true. That restricts the unpickler to an allowlist of tensor-ish types and refuses everything else. You'll actually watch it refuse a malicious file in a minute. And if you pass weights only equals false, you turn the old danger right back on.

A: A safetensors file is deliberately boring. Eight bytes saying how long the header is. Then a JSON header that lists each tensor's name, dtype, shape, and byte offsets. Then all the raw bytes, packed together. That's it. No code, nothing to execute. The worst a malicious file can do is lie about shapes, and the loader checks those. And because each tensor is just a byte range at a known offset, the loader can M map the file and hand you tensors that point straight into the mapping. That's the "zero-copy" in the safetensors pitch, and it's why Hugging Face transformers loads safetensors by default.

A: So picture two lanes. Top lane, torch dot load. SSD on the left, then the page cache, copy one, the kernel's. Then an arrow labelled memcpy, a memory copy, into your heap. Copy two, your tensors. And before any of that, it has to unpickle, running instructions from the file. Bottom lane, safetensors. SSD, then the page cache, and that's the only copy. Pulled in on first touch. And your tensors are just addresses, pointing back at it. Shared by every process that maps the same file.

A: Two caveats so you don't over-learn this. First, torch dot load has an M map equals true option, since PyTorch two point one. Same lazy, mapped loading, for dot P T files. So the real advantages of safetensors are the safety, and the simple documented layout. Any language can read it, and you can read one tensor without parsing anything else.

B: But doesn't it all end up on the GPU anyway? So who cares about the CPU copy?

A: Right, the tensors eventually go where the compute is. Dot to cuda copies them into GPU memory no matter how you loaded them. What M map saves is the extra copy on the CPU side, and the time it takes to make it. On a normal machine with a separate GPU, that's page cache straight to GPU, instead of page cache to heap to GPU. The Spark's GPU shares one pool of memory with the CPU, though. So there, honestly, it's worth measuring rather than assuming.

<!-- section: Cold and warm -->

A: Last piece. Why the same load is fast on Friday afternoon and slow on Monday morning. The first load of a file reads it from the SSD into the page cache. That's a cold load. Every load after that, in any process, finds the pages already cached. That's a warm load, at memory speed. And those pages stay until the kernel needs the RAM for something else, or the machine reboots. Linux and macOS will happily use most of your "free" RAM as page cache. That's why, when you run free dash H on the Spark, there's a big number under buff slash cache.

B: So on Friday the file was warm from all my runs, and over the weekend something pushed it out. Or a reboot.

A: Exactly that. So any loading benchmark has to say which one it measured. A forty millisecond load of an eight billion parameter model is an M map that hasn't touched anything yet. The honest cold cost for sixteen gigabytes is a few seconds. And you pay it either at load time or during the first forward pass.

<!-- section: Predict: cold vs warm load -->

A: Okay, rank these. A two point one gigabyte state dict, B F sixteen, on that M four Pro. Four ways to get every byte into tensors and then sum them. Torch dot load cold. Torch dot load warm. Safetensors load file, which uses M map, cold. And safetensors warm. Fastest to slowest, and a guess at the time. The SSD reads big sequential chunks at about six point six gigabytes a second, memory copies run at about ten to seventeen.

B: [working it out] Okay. M map is no copy, so safetensors warm is first. Then... safetensors cold, because still no copy. Then torch dot load warm, then torch dot load cold last. Times, I don't know, safetensors warm a hundred milliseconds, cold maybe half a second?

A: [warmly] You got the top right. Safetensors warm, about a hundred milliseconds. Twelve to "load", about ninety to touch and sum. No copy, the data's already mapped. Second is torch dot load warm, about three hundred milliseconds. About two thirty to load and seventy to sum. And that extra two hundred or so is the memory copy from page cache into fresh tensors, at about ten gigabytes a second. Third, torch dot load cold. About half a second to seven tenths. One big sequential read per storage, close to the SSD's speed.

B: [surprised] So safetensors cold is last?

A: Safetensors cold is last. About one point eight to two point seven seconds. That's the surprise. "Loading" took fifty to seventy milliseconds, and then touching every tensor page-faulted the file in, a small piece at a time, at under a gigabyte a second. And if you ranked M map first in both, you're in very good company. M map wins big when the file's warm, when several processes share it, or when you only need some of the tensors. But cold, reading everything, on macOS, a few huge reads beat a few hundred thousand page faults. Linux handles readahead for M map faults differently, and it might close the gap. That's one of your Spark measurements.

<!-- section: Eight workers, one model -->

A: Here's where this stops being trivia. Say you run eight inference workers on one machine, and each one loads the same sixteen gigabyte model. How much RAM?

B: With torch dot load each one makes its own copy. So eight times sixteen, a hundred twenty-eight gigabytes. Plus the page cache.

A: Plus the page cache. Which doesn't fit on most machines. That's the whole Spark, just in duplicate weights. With M mapped safetensors, all eight share one sixteen gigabyte page-cache copy. The first worker pays the cold read, a few seconds at a few gigabytes a second, and the rest start warm. Now, if the weights go to GPUs, each GPU still needs its own copy, and that host-to-device copy becomes your startup cost. And as you go to, say, fifty workers across more machines, each machine pays its own cold read. And if all fifty pull sixteen gigabytes from shared network storage at the same moment—

B: [jumping in] That's eight hundred gigabytes through one pipe.

A: [matter-of-fact] Eight hundred gigabytes through one pipe. Now the storage is the bottleneck. So you'd put a local SSD cache on each node, or stagger the starts, or load once and broadcast it over the fast interconnect between machines.

<!-- section: Build It: setup -->

A: So here's what you'd actually build. Everything goes in a workbench disk folder. A venv with torch, safetensors and the Hugging Face hub library. Run each experiment on the Mac first, then the Spark, because the two OSes disagree on exactly the things this is about. For a real model, you grab SmolLM two, the hundred thirty-five million parameter instruct one. Two hundred sixty-nine megabytes in B F sixteen, small enough to iterate fast. And a little prep script saves it as both a dot P T and a safetensors file. It also makes a bigger synthetic one, sixty-four random tensors, each four thousand ninety-six by four thousand ninety-six in B F sixteen, thirty-two megabytes apiece, so two point one gigabytes total. Big enough that the timings are easy to see.

A: The genuinely hard part of any disk benchmark is getting a cold file on demand. On Linux, you can drop the whole page cache. You sync, then write the number three into a special kernel file called drop caches, with sudo. Or without root, you can evict just one file. Open it, F sync it, then call posix F advise with don't need, and the kernel drops that file's clean pages. On macOS there's sudo purge. Or without sudo, you make a fresh copy of the file with caching switched off on both ends, so its pages never enter the cache, and do a full F sync at the end. Then check it worked: read the copy twice. The first should run near SSD speed, the second much faster. The author got six point six, then seventeen.

<!-- section: Build It: see the syscalls, and the buffer -->

A: First experiment, feel the buffer. Two hundred thousand one byte writes to a normal file, then the same to a file opened with buffering set to zero. Predict the ratio first from the numbers earlier. It came out forty nanoseconds versus one point eight microseconds per call. About forty-five times.

A: Then you look at the syscalls themselves, on the Spark, with a tool called S trace. It prints every syscall a program makes. You run a one-liner that opens out dot T X T, writes "hello", writes "world", and closes. And among all of Python's startup noise, near the end, you'd see three lines. An open at call on out dot T X T, with flags for write only, create, and truncate, returning three. Then one write to file descriptor three, twelve bytes, hello and world together. Then close three.

B: One write. For two f dot writes.

A: One write syscall for two f dot write calls. That's the buffer, right there. And that truncate flag, O trunc, is the flag that destroyed the checkpoint at the start. And notice what's missing. No F sync anywhere. Then you run it again adding an F sync before close, then a flush before that, then an O S dot replace at the end, and find each one in the trace. And finally trace a torch dot save and count how many writes it makes. On the Mac the equivalent tool is called D truss, but System Integrity Protection blocks it for most programs, and the author couldn't get it working without turning that off. So use the Spark.

<!-- section: Build It: time writes with and without fsync -->

A: Second experiment, an F sync benchmark. Write a thousand blocks of four kilobytes in four modes. No sync at all. F sync after each. F data sync, which only exists on Linux. And F full F sync, which only exists on the Mac. And you use the raw O S level open and write, so Python's buffer stays out of it. That's where the four microseconds, forty microseconds, four milliseconds numbers come from on the Mac. On the Spark, if F sync comes in at tens of microseconds, you've got a very fast drive, or one acknowledging from a protected cache. If it's milliseconds, it's doing what F full F sync does on the Mac.

A: Then a second part. Write five hundred twelve megabytes in a single write, and time the flush and the F sync separately. Where does the time go? On the Mac, the write took about a tenth to a quarter of a second, and the F sync after it only a few milliseconds. F full F sync, fifty to eighty milliseconds.

B: [skeptical] That's weirdly cheap for half a gigabyte. Why's the F sync so fast there?

A: Because the data was already streaming out to the drive while the write was still going. By the time you asked, most of it was there. Linux may split that differently, so compare.

<!-- section: Build It: crash a save with kill -9 -->

A: Third, you actually crash a save. One script builds about a gigabyte of state dict, two hundred fifty-six tensors of four megabytes each in fp thirty-two, and saves it either naively or with your atomic save. Another script makes a good checkpoint first, then starts a second save as a subprocess, waits for it to print "ready", sleeps some delay, and sends it kill dash nine. Then it prints the size of every checkpoint file and tries to load it. A couple of hints make the atomic version short. Torch dot save accepts an open file object, so you can open the temp file yourself, save into it, flush, and F sync. And to F sync a directory, you open the directory read-only with O S dot open, and that gives you a descriptor you can pass to F sync. Try delays from fifty milliseconds to a second and find the window where the naive save breaks.

A: And what you'd see, on the Mac, killed at a hundred fifty milliseconds. The naive file: two hundred sixty-four megabytes, out of one point oh seven gigabytes. Torch dot load fails, central directory.

B: [working it out] And those two hundred sixty-four megabytes are, like... exactly what it had written so far. Because the page cache kept them when the process died.

A: Every byte the process had handed to write before it died was there. And nothing after. That's the page-cache-survives-kill fact, made visible. The zip index was missing, so the load failed. The atomic version left a partial temp file, about four hundred eighty-seven megabytes, and a perfectly good ckpt dot P T. One point oh seven gigabytes, two hundred fifty-six tensors. So on startup, delete stray temp files and move on. You can't easily pull the power on purpose, so the power-cut side stays a thought experiment. The kill test shows the truncation bug, and the picture of the write path shows why the F syncs matter beyond it.

<!-- section: Build It: load weights four ways -->

A: Fourth, the loading matrix. One script that loads a file one of four ways. Torch dot load. Torch dot load with M map. Safetensors load file. Or safe open and pull just the first tensor. It times the load, then times touching every byte by summing everything, and prints peak memory, the R S S. R S S is resident set size, how much of the process's memory is actually in physical RAM right now. And careful, macOS reports that in bytes and Linux in kilobytes. Then a little driver makes the file cold, runs that once cold, then again warm. And each method in a fresh process. Otherwise the second method inherits the first one's cache and its imports, and the comparison's meaningless.

A: The numbers, on the Mac, for the two point one gigabyte file. Torch dot load, load plus touch, about half a second to seven tenths cold, about three tenths warm. Torch dot load with M map, about one point three to two seconds cold, about a tenth warm. Safetensors load file, about one point eight to two point seven cold, about a tenth warm. And just the "load" step of safetensors, before touching anything, fifty to seventy milliseconds cold, twelve warm. One tensor through safe open, cold, about a millisecond to open plus twenty to fifty to touch it. Warm, about five milliseconds.

A: So warm, the M map loads cost about a hundred milliseconds for two point one gigabytes. That's about the time it takes just to sum the numbers once. Torch dot load adds a two hundred millisecond memory copy on top. Scale that to sixteen gigabytes and it's about one and a half seconds, and sixteen gigabytes of private RAM per process. And cold, M map loses. Reading every byte through page faults ran under a gigabyte a second. Torch dot load's big reads ran at three to five. So, M map is not "faster disk". It's "no copy, and lazy". When you're going to read everything from a cold disk right away, one big read can win. Libraries that care either tell the kernel what's coming, with a call named M advise, saying "I'll need this" or "I'm reading this sequentially", or they just read the file.

B: [skeptical] And memory? If safetensors doesn't copy, it should use way less.

A: You'd think so. But peak R S S was about the same for every full load, about two point four gigabytes. Because R S S counts mapped file pages once you touch them, not just memory you allocated. The difference is what kind of memory. Mapped pages are clean and shared with the page cache, so the kernel can drop them, and a second process mapping the same file uses the very same pages. Torch dot load's are private copies. So two torch dot load workers cost two times two point one gigabytes, plus the page cache. Two M map workers cost one page cache's worth. And with one tensor out of the two point one gigabytes, only that tensor's pages ever come in. The peak was about three hundred twenty megabytes, and that's mostly PyTorch itself.

<!-- section: Build It: look inside both formats, and pickle's trapdoor -->

A: Fifth, you open the files by hand. Unzip the dot P T and you find data dot P K L and the numbered storages. Run Python's pickle tools module on that pickle and it prints the instructions the unpickler will run. You'll see ones called global and reduce. Global means "go fetch this function", reduce means "now call it". Then read the safetensors header yourself, with nothing but the standard library. The first eight bytes are one unsigned sixty-four bit integer, little-endian, the length. The next that-many bytes are JSON. For SmolLM two, the first tensor is model dot embed tokens dot weight, B F sixteen, shape forty-nine thousand one fifty-two by five seventy-six, sitting at bytes zero to fifty-six million six hundred twenty-three thousand one hundred four. And you can check that. Forty-nine thousand one fifty-two times five seventy-six, times two bytes for B F sixteen, gives you exactly that number.

A: And then the trapdoor. You write a tiny class whose reduce method says "to rebuild me, call O S dot system with echo pwned". Put one of those in a dictionary next to a real tensor, and torch dot save it. Now load it with the default settings. It raises an unpickling error. Refused. Then load it with weights only equals false... and your terminal prints "pwned".

B: [quietly] So the file just ran a shell command. Inside my process.

A: Inside your process. So only ever do that with your own file.

<!-- section: Build It: repeat on the Spark -->

A: And last, repeat it all on the Spark. Copy the folder over with rsync over Tailscale, skip the big files and regenerate them there. Rerun the F sync benchmark, the crash test, the loading matrix, using drop caches or F advise for the cold runs. Also note which filesystem you're on, with D F dash capital T. The memory page size, with get conf page size. ARM sixty-four Linux kernels may use four kilobyte or sixty-four kilobyte pages, and macOS on Apple silicon uses sixteen. And that dirty expire setting. Then have an agent review your loading driver for unfair comparisons. A method that ran warm when it was supposed to be cold. Imports counted in one timing and not another. R S S units mixed up between bytes and kilobytes. You're done when you've traced a Python write on the Spark and can point to the open at, the single write, and the F sync once you add it. When the F sync benchmark has numbers on both machines and you can say why macOS has two F syncs. When a naive save broke under kill dash nine and your atomic save survived every delay. And when the loading table's filled in, and you can explain the row where M map is slower.

<!-- section: Break It -->

A: Then you break things on purpose. First one. In your atomic save, swap the order. F sync first, then flush.

B: That's... still going to pass every test, isn't it.

A: It still "works" in every test you can run. Which is what makes it dangerous. F sync ran while the last chunk of the checkpoint was still sitting in Python's buffer. So that chunk wasn't durable when you renamed. Go back to that write path picture: write two chunks, F sync, power cut. That's this bug. And it's the kind of mistake the layers model catches and testing doesn't.

A: Second. Put the temp file in slash temp, and rename it into your checkpoint folder.

B: [a bit unsure] Should be fine? It's still a rename.

A: On Linux, slash temp is often a different filesystem. On many distros it's temp F S, which lives in RAM. And rename only works within one filesystem. So O S dot replace fails with an error that says invalid cross-device link. Error eighteen. And then the tempting "fix" is shutil dot move, which quietly copies the data over and deletes the original. Which isn't atomic at all. You're back to writing in place. So keep the temp file right next to the target.

A: Third. Ignore an F sync error. F sync can fail. A dying drive, a full disk on some filesystems, a network filesystem that lost its server.

B: Then I'd just retry it.

A: [serious] That's the instinct, and it's exactly the wrong one. If F sync fails, what's in the page cache is now in an unknown state. In twenty eighteen the PostgreSQL developers discovered something people ended up calling fsyncgate. On Linux, after a failed F sync, the kernel could mark the dirty pages as clean anyway. So retrying F sync would succeed... without the data ever having been written.

B: [surprised] The retry lies.

A: The retry lies. So the only safe response to an F sync error is to treat the data as lost and redo the write from a copy you trust. Your atomic save should raise, not retry. And never rename after a failed F sync.

A: Fourth. Benchmark the page cache by accident. Run the cold loading test twice without making the file cold in between. The "cold" M map number collapses from seconds to about a hundred milliseconds, and you conclude M map is magic. Or make your fresh copy with a plain shutil dot copy instead of the no-cache copy. Still warm. Because writing the copy put it in the page cache. So every time you hear "loads in forty milliseconds", the question is: cold, or warm?

<!-- section: Connections and close -->

A: And this goes further than checkpoints. The journal and the write-temp-then-rename trick are the seeds of how databases make transactions durable. A write-ahead log, F synced at commit, is the journal idea applied to rows instead of I nodes. And cold versus warm loading is one of the first things to check when an inference server's startup, or its first request, is mysteriously slow. If you want the long version, the three chapters in Operating Systems: Three Easy Pieces on files, crash consistency and flash SSDs, and Dan Luu's short post, "Files are hard".

B: [working it out] Okay, let me try the whole thing. When I write, the bytes go into Python's buffer, then the kernel's page cache, then the drive's cache, then flash. Write returning only means the kernel has it. Killing the process only loses the buffer, a power cut loses everything that isn't on flash, and F sync is how you know it's on flash. So to save a checkpoint safely, you write a temp file, F sync it, and rename it over the old one. And M map is fast because it skips copying the file into memory.

A: [gently] Almost all of that, yes. Two sharpenings. F sync only counts if you flushed first, and on a Mac you need the full version to really reach flash. And the recipe has a fourth step: F sync the directory, or the rename itself can vanish in a power cut. And M map doesn't skip copying the file into memory. The file still has to come into the page cache. It skips the second copy, into your own heap. So warm, it's nearly free, and shared across every process. Cold, reading everything at once, one big read can beat it. It's not a faster disk. It's no copy, and lazy.
