<!-- section: Nine hours -->

A: [relaxed, thinking out loud] So your cross-encoder's been training for nine hours. And every so often it saves a checkpoint. Same file every time, just overwritten with the newest one. Then the job dies. Maybe it got preempted, maybe the Spark lost power, maybe you hit control C twice in the wrong terminal. Doesn't matter. You restart from the checkpoint, and PyTorch says it can't read it. The file's broken.

B: The newest one, you mean. So you fall back to the one before.

A: There is no one before. There was only ever one file. And the save that was running when the job died had already wiped it and was halfway through writing the new one. So the old checkpoint's gone, and the new one never finished. Nine hours, back to zero.

B: [skeptical] Wait, wiped it? It writes over the top. Surely the old bytes are still there until the new ones replace them.

A: That's the bit nobody looks at. When you open a file for writing the normal way, the very first thing that happens is the file gets cut down to nothing. Empty. Then the new checkpoint gets written in over the next few seconds. Crash anywhere in those few seconds, even a plain kill, and you've got half a file. And PyTorch's checkpoint format is a zip, and a zip keeps its index at the very end. Which is exactly the part that never got written.

B: Ouch.

A: So that's the scary half. Here's the puzzling half. You load a big model with safetensors, and it says it loaded in a blink. Way faster than the disk could possibly read that much. Then next Monday morning, the same load is slow again. Nothing changed.

B: Okay. And those are connected?

A: Same root. Between you writing bytes and those bytes being safe on the drive, they sit in a whole chain of holding areas. Each one run by somebody different, and most of them forget everything the moment the power goes. Run that chain backwards and you get the loading story.

<!-- section: Where the bytes actually go -->

B: [a bit unsure] See, I'd always assumed when write comes back, that's it. It's on disk. Saving's one step.

A: That's what it feels like, and it's the thing to drop. Let's just follow the bytes. You call write in Python. First stop, Python doesn't even talk to the operating system. It copies your bytes into a little buffer inside your own process, and only when that fills up, or you flush or close, does it make one real request to the kernel. The kernel's the core of the operating system, the one program that's allowed to touch the hardware.

B: Why bother buffering?

A: Because every trip into the kernel costs something. Not a lot, but if you did it for every single byte, it'd be dozens of times slower than just copying into your own memory. So you batch. First holding area, your own process. If your process dies right there, those bytes die with it.

B: Fine. And then the kernel writes it to the disk.

A: Then the kernel copies it into its own memory, marks it as "changed, not saved yet", and says, done. Success. It hasn't gone near the drive. That memory has a name, page cache. It's the kernel's copy of file data, sitting in RAM that'd otherwise be idle. And it'll get around to writing those changed pieces out later, in the background, usually within something like half a minute.

B: So write succeeding just means the kernel's got a copy.

A: Just that. "The kernel has it", not "it's on disk". That's the most important sentence in this whole thing.

B: [skeptical] That feels like lying.

A: It is, a little. But it makes almost everything faster. Writes come back right away. If you change the same spot ten times, only the last version goes to the drive. Lots of little writes get merged into big ones. And reading something you just wrote comes straight out of RAM. And here's a nice consequence. That cache belongs to the kernel, not to you. So if your process gets killed, whatever already made it into the kernel's cache survives. The kernel just writes it out as if nothing happened.

B: Huh. So a kill only loses what's still in my own buffer.

A: Right. A power cut is different. The kernel's cache is RAM, and RAM forgets. And then there's one more layer people don't expect. Even when the kernel does send your data to the SSD, the drive has its own little bit of memory, and it might say "got it" as soon as the data lands there, before it's actually stored in the flash. The fancy data-center drives carry a bit of stored energy to finish the job if the power drops. Ordinary ones usually don't.

B: [working it out] So it's four places. My buffer, the kernel's cache, the drive's cache, and the actual flash. And only the last one survives the power going out.

A: Four places. And each one tells the one above it "done" a little before it's really done.

<!-- section: The one promise -->

B: So how do I ever know it's actually on disk?

A: There's exactly one call for it. fsync. It waits until the kernel has sent every changed piece of that file down to the drive, and the drive has said it's really stored. When fsync comes back without an error, your data is durable. That's the word, durable, it survives a crash or a power cut.

B: And it's slow, I'm guessing.

A: It costs you a wait for the device. But here's the useful part. The cost is mostly per call, not per byte. It's a round trip to the drive and a "flush your cache" order. So one fsync at the end of a big checkpoint is basically free. Those bytes had to get to the drive eventually anyway, you just wait for it once. But a logger that calls fsync after every single little line, many times a second, that can eat a real chunk of your training loop waiting on tiny writes.

B: So batch them.

A: Batch them, and decide how much you're willing to lose. And there's a Mac twist I didn't believe until I measured it. On a Mac, plain fsync sends your data to the drive, but doesn't tell the drive to flush its own cache. Apple says so in their own docs. There's a separate call that goes all the way to the flash. When I timed them on my MacBook, plain fsync was about ten times the cost of a plain write. The all-the-way one was about a thousand times.

B: [laughs] So the cheap one is cheap because it isn't doing the thing.

A: Pretty much. On Linux, fsync is the honest one, it includes the flush.

<!-- section: Zero bytes -->

A: [warm] There's a lovely bit of history here. Two thousand nine. People testing Ubuntu with the new ext four filesystem start losing files after crashes. Not old files. Config files their desktop had just rewritten. After a reboot, the file's there. Right name. Zero bytes long.

B: How does that even happen?

A: The programs were doing the classic careful thing. Write the new contents to a temporary file, then rename it over the real one. But they skipped the fsync in the middle. And on the old filesystem, ext three, that happened to be safe, because ext three wrote the file's data before it recorded the rename. ext four held data in memory longer, to group writes together. So the rename, which is tiny, could reach the disk first. Crash in that gap, and the name points at a file with nothing in it.

B: So who was wrong? The filesystem or the programs?

A: That was the fight. Ted Ts'o, who maintained ext four, pointed out the standard never promised the old behaviour. If you want data on disk, you call fsync. The programs had been relying on luck. He was right. And he also added a workaround to ext four anyway, because millions of programs were never going to get fixed. Then a few years later some researchers took a bunch of popular programs, databases, version control, and crashed them on purpose at every point. They found bugs of exactly this kind in almost all of them.

B: That's weirdly comforting.

A: It is. Saving a file properly is genuinely hard, and almost everyone gets it wrong the first time.

<!-- section: Saving so nothing can break it -->

B: Okay, so what's the right way?

A: It rests on one fact about what a file is. The name and the data are separate things. The data lives in blocks on the disk. The name is just a line in the folder saying "this name means that file". Renaming only rewrites that line. It doesn't move a single byte of data. Which is why renaming a huge file is instant. And the operating system promises that renaming over an existing name happens all at once. Anyone opening the name gets either the old file or the new one. Never a mix. That's what people mean by atomic.

B: [working it out] So I write the new checkpoint somewhere else first, and then swap the name.

A: That's the heart of it. Write to a temp file, right next to the real one, in the same folder. Flush Python's buffer. Fsync it, so the new data is really on the drive. Then rename it over the real name. And then, the step almost everyone skips, fsync the folder itself. Because the rename is a change to the folder, and like any change, it's sitting in the kernel's cache until it's written.

B: Why does the temp file have to be in the same folder?

A: Because rename is only all-or-nothing within one filesystem. If your temp file's somewhere that's a different filesystem, the rename either fails, or some helper quietly copies the data across instead. And copying is just writing in place again. You're back where you started.

B: And with all that, what's the worst case?

A: You wake up on the old checkpoint, whole. Maybe you lose the last save, but you never lose everything. And the nice thing is you can see why each step is there. Against a killed process, the rename alone saves you, because the kernel's cache survives. Against a power cut, you need the fsyncs, because it doesn't. Real jobs die both ways, so you want the recipe that survives both.

B: Doesn't the filesystem have some kind of crash protection built in? I've heard of journaling.

A: It does, but it protects the filesystem, not your file. A journal is the filesystem writing down what it's about to change before it changes it, so after a crash it can finish or undo the half-done bits. Same idea databases call a write-ahead log. But on a normal Linux setup it covers the bookkeeping, where files are, how big they are. Not the contents of your checkpoint. Keeping your file whole is still your job.

<!-- section: Reading it back -->

A: Now run the chain backwards, and you get the loading mystery. When you read a file, the kernel keeps what it read in that same page cache. And it'll happily keep it there until it needs the memory for something else, or the machine reboots.

B: So the second time I load a model, it's coming out of RAM.

A: Right. The first load, from the drive, is called cold. Every load after that, from any process, is warm, and it runs at memory speed. That's your Friday afternoon versus Monday morning. Reboot over the weekend, and the cache is empty.

B: And the blink-fast load?

A: That's the other trick. There are two ways to get a file's bytes into your program. The plain one is read. The kernel copies bytes out of its cache into memory you own. So you end up with two copies, the kernel's and yours. The other one is mmap. You ask the kernel to make the file appear as part of your memory. Nothing moves when you do that. The first time you touch a piece, the kernel quietly points it at its cache. One copy. The kernel's cache is your data.

B: [working it out] So the blink-fast load was mmap returning before it had read anything.

A: Exactly that. It hadn't done anything yet. The real cost shows up later, the first time the model actually uses each piece. So whenever someone tells you a model loads in a few milliseconds, the question to ask is, cold or warm, and did it touch the weights?

B: Still, mmap sounds strictly better. Fewer copies, shared between processes.

A: That's what I thought, and this was the surprise when I measured it. Warm, mmap wins easily, nothing to copy. If several workers map the same weights file, they all share one copy instead of each getting their own. If you only need some of the tensors, you only read those. But cold, reading everything right away, on my Mac, mmap lost. Clearly. Because instead of a few huge reads, which the drive loves, it was pulling the file in through a trickle of tiny requests, one little piece at a time as each one got touched.

B: So mmap isn't faster disk.

A: mmap isn't faster disk. It's no copy, and lazy. Whether that wins depends on what you're doing next. And whether Linux's habit of reading ahead closes that gap on the Spark is one of the things worth checking for yourself.

B: And safetensors is just mmap with a file format?

A: That plus being boring on purpose. A normal PyTorch checkpoint uses pickle, Python's format for turning objects into bytes. And unpickling can run any code the file tells it to. For years, loading a stranger's checkpoint was the same as running their script. Newer PyTorch locks that down by default. Safetensors just has a little header saying where each tensor is, then the raw numbers. Nothing to execute. And because each tensor's just a range of bytes at a known spot, it can map the file and hand you tensors pointing straight into it.

<!-- section: Ending -->

B: Okay, let me try it. Saving isn't one step. My bytes go through my own buffer, then the kernel's cache, then the drive's cache, then flash, and write coming back only means they reached the kernel. So to save safely, I write a temp file, fsync it, rename it over the real one, and fsync the folder. And when loading, the speed mostly depends on whether the kernel already has the file in memory.

A: That's it. The bit I'd sharpen is the last part. It's not just whether it's cached, it's what you're counting. mmap moves the cost from the load to the first touch, so a fast load number can be hiding all the real work. Whenever you see a timing, saving or loading, ask which layer it actually reached. Did the bytes get to flash, or just to the kernel? Did the load read the weights, or just promise to?
