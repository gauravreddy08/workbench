<!-- section: Killed -->

A: [relaxed, thinking out loud] So you want to try one of the big models on the Spark. A seventy billion parameter one. The full-size weights don't fit, so you grab an eight-bit version, about seventy gigabytes. The Spark has a hundred and twenty-eight. You check how much is free, it says something like a hundred and fifteen available. Plenty of room. You write the obvious script. Load the weights, build the model, move it to the GPU.

B: Sounds fine.

A: It runs for a few minutes. The disk light's blinking. The desktop gets kind of sluggish. And then the terminal prints one word, and gives you your prompt back. Killed.

B: Just "Killed"?

A: Just that. No Python traceback. No error you could have caught. Nothing.

B: [a bit unsure] That's weird though. If there wasn't enough memory, the allocation should have failed. Python should have thrown a MemoryError, and I'd at least know which line did it.

A: That's what almost everyone expects. And it's the thing to let go of. Every single allocation Python asked for succeeded. Nobody ever said no to your program. Something outside it just decided it should stop existing.

B: Okay, that's unsettling.

A: It is. And there are really three things here that should bother you. Nothing failed. You seemed to have room to spare. And moving the model to the GPU, which sounds like it should take memory off the CPU's plate, somehow made things worse. All three come from one idea. The addresses your program uses aren't real.

<!-- section: The machine does the shuffling -->

A: [warm] It helps to go back to where this came from. In the nineteen fifties, a computer had a little bit of fast memory and a big slow drum to store things on. And if your program didn't fit in the fast memory, that was your problem. You'd chop the program into pieces yourself, and write code to shuffle the pieces in and out by hand.

B: Every programmer had to do that?

A: Every one. Some people reckoned programmers were spending half their time on that plumbing. And then the team building the Atlas computer at Manchester, Tom Kilburn and his colleagues, in the early sixties, had this kind of radical thought. What if the machine did it? Every program just sees one big, smooth memory. Underneath, the hardware chops it into fixed-size chunks, keeps a list of which chunks are really in fast memory and which are out on the drum, and when you touch one that isn't there, it stops, fetches it, and carries on. You never know.

B: And that's virtual memory.

A: That's virtual memory. They called it the one-level store. And every laptop and phone and GPU server you've ever used works that way.

<!-- section: A hotel with fake room numbers -->

A: The picture I like is a hotel. Every guest gets told, your rooms are numbered from zero up to a million, use whichever you want.

B: [laughs] And the hotel has, what, a few hundred rooms?

A: A few hundred. Which sounds absurd. But the front desk keeps a private book for each guest. Your room seven is really room two hundred and twelve. The guest never sees the book. They just walk to room seven and get quietly sent to the right place. And because most guests only ever use a handful of rooms, a few hundred real ones go a long way.

B: So the guest is my process, and the room numbers are the addresses my program sees.

A: Right. And the real rooms are the actual RAM chips. The front desk is a bit of hardware in the processor that translates every address, every single time you touch memory, plus the operating system, which writes the books. And it doesn't keep an entry for every byte, that'd be crazy, the book would be bigger than the memory. It translates in fixed-size chunks called pages. Each process gets its own book, and its real name is a page table.

B: [skeptical] Translating every memory access sounds slow, though.

A: It would be, so the processor keeps a tiny cache of the last few translations it did. Most of the time the answer's already there and it costs basically nothing. And there's a nice side effect of all this. Two programs can both use the same address and mean completely different memory, because they've got different books. That's the wall between processes. One just can't reach the other's rooms.

<!-- section: Asking is not getting -->

A: Now here's the part that explains your missing MemoryError. Say a guest calls the desk and reserves fifty thousand rooms. What does the desk do?

B: [working it out] It can't actually give them fifty thousand rooms.

A: It doesn't try. It writes "reserved" in the book, and assigns nothing. A real room only gets handed over the first time the guest actually opens the door. And that's exactly what happens when your program asks for memory. The operating system writes down a note, these addresses belong to you, and returns straight away. No real memory changes hands.

B: So asking for a lot of memory is basically free.

A: Asking is free. When I tried this on my Mac, I asked for a hundred gigabytes on a laptop with forty-eight. It said yes, instantly. And the memory my process was actually holding didn't move at all. Then you start writing to it, and it climbs, one page at a time.

B: How does it know when I've touched a new page?

A: The translator goes to look up that page, finds nothing in the book, and can't finish the instruction. So it stops, and hands control to the operating system. That's called a page fault. Which sounds like an error, but most of the time it's just the plan working. The kernel, that's the core of the operating system, looks at its notes, sees, oh, this was reserved, grabs a free chunk of real memory, fills in the book, and lets your instruction run again. Your program never notices.

B: Huh. So a "fault" is mostly just the delivery happening late.

A: That's a good way to say it. Lazy delivery. Memory is a promise when you ask, and it's only real when you touch.

<!-- section: The kernel's bet -->

B: [jumping in] Okay, but then the obvious question. If it hands out promises without checking, what stops it from promising more than it has?

A: Nothing. On purpose. Linux promises more memory than exists, as a policy. It's called overcommit. And it's a bet that most of what gets reserved will never be touched.

B: That feels reckless.

A: It feels reckless, but it's usually a good bet. Programs reserve way more than they use. Every thread sets aside room for its stack and touches a tiny corner of it. And the big one is fork, when a process clones itself. A huge process clones itself to run some tiny command. If the kernel had to guarantee a full second copy of all that memory, just in case, you'd need double the memory to run a shell command. So it just says yes.

B: And when the bet loses?

A: Then you get the ugly part. Think about where the bad news lands. Your program isn't calling a function that could return "sorry, no". It's in the middle of writing a number to an address. There's no return value. The fault has to be resolved, right now, with a real chunk of memory, and there isn't one.

B: So it has to find one somewhere.

A: First it tries to free some up. And this is where it matters what kind of memory you've got. Some memory is just a copy of something that's already on disk. A file you read, the code of Python itself, a model file. The kernel can throw that away, because if anyone needs it again, it can just read it back. That's the cheap kind.

B: And the other kind?

A: The other kind has no copy anywhere else. Your heap, your arrays, every tensor you built on the CPU. People call that anonymous memory. The only way to free it is to write it out to disk first, to a space set aside for that, called swap. And if there's no swap, or it's full, that memory just can't be freed. It's stuck until the process lets go or dies.

B: [working it out] So "available" was counting a bunch of stuff that could be thrown away. But my weights weren't that kind.

A: Right. And when there's nothing left to throw away, the kernel does the last thing it can. It picks a process and kills it. That's the OOM killer, out of memory. It scores everyone, roughly by how much memory they're holding, and kills the biggest, because that frees the most with the fewest deaths. Which, in your case, was you.

B: And it can't send a nicer signal? Let Python clean up, print something?

A: It uses the one signal a process can't catch or ignore. The program just stops. That's why you got one word. The only place the story gets written down is the kernel's own log. If you go and read it, there's a line saying who it killed, and how much real memory they were holding.

<!-- section: Reading is writing -->

B: You mentioned fork. Is that why my data loader workers get huge? I've seen that. Each worker looks enormous, and I'm only reading the data.

A: Yeah, this is a great one, and it's the same idea again. When a process forks, the kernel doesn't actually copy its memory. It copies the book, and marks every page read-only in both. So parent and child share all the real memory. The moment either one writes to a page, it trips, and the kernel copies just that one page. That's called copy on write. Only what actually changes gets duplicated.

B: Which is perfect for workers that only read.

A: You'd think. Here's the twist. Every Python object carries a little counter of how many things are pointing at it. The reference count. And when your worker just looks at an element, binds it to a variable, that counter goes up, and then back down. Which is a write. To whatever page that object lives on.

B: [a beat] Oh no. So reading a Python object writes to memory.

A: Reading a Python object writes to memory. If your dataset is a list of millions of little Python objects, every page they sit on gets touched, so every page gets copied, into every worker. Over the first epoch, each one slowly builds its own private copy of your dataset. It looks like a leak. It isn't, it's just copy on write doing exactly what it says.

B: And if it's a NumPy array?

A: Then it's one big block of raw numbers with one header. Summing it reads the numbers and writes nothing. So it stays shared forever. That's the fix, really. Keep the data in a few big buffers, not millions of little objects.

<!-- section: One pool -->

A: Okay, back to the Spark, and the third mystery. Why did moving to the GPU make it worse?

B: Yeah, on my old setup that would just copy the weights over to the card's own memory.

A: On a normal machine, yes. The GPU has its own memory, on its own board, and if you run out there, you get a CUDA out of memory error you can actually catch. The Spark is built differently. The processor and the GPU draw from one shared pool. There's no separate GPU memory. When the GPU asks for room, it comes out of the same pool your Python heap lives in.

B: [working it out] So walk me through the load.

A: You read the file, so its pages land in that cheap, throwaway file copy. Then the load copies all of it into your process's own anonymous memory. Seventy gigabytes of the stuck kind. So far it fits, because the kernel quietly drops the file copy to make room. Then you move it to the GPU, which allocates another seventy, from the same pool, while the CPU copy is still sitting there.

B: Two full copies of the model in one pool.

A: Two full copies, and neither of them is the droppable kind. So there's nothing left to reclaim, and the killer picks the biggest process. You.

B: So the fix is to never have two copies.

A: Never have two copies. The nicest way is to memory-map the weights file. That's mmap. Instead of reading the file into new memory, you tell the kernel, make this file appear as memory. Then the weights are just the file's own pages, the cheap, droppable kind. Move them to the GPU one tensor at a time, and as each one goes, the kernel can let go of its file pages. One copy at the peak, not two.

B: And that's what loading safetensors that way gets you.

A: That's what it gets you. And the other habit worth having is, when you want to see what happens at the edge, do it in a small box. Linux can draw a fence around a group of processes and give them their own memory limit. That's a cgroup, and it's most of what a Docker container is. Go over the limit and the killer runs only inside the box.

B: So I can blow it up on purpose without taking down my SSH session.

A: That's exactly how I did it. Set a small limit, run a script that keeps grabbing memory and writing to it, and watch it die right at the fence. And the thing that surprised me most was a pair of experiments in that box. Ask for a giant array of zeros and it survives, holding almost nothing. Ask for the same size full of ones and it dies. Same size request. But ones have to actually be written, and written pages are the ones that count.

<!-- section: Ending -->

B: Okay, let me try it. Every program's addresses are pretend, and the processor translates them, page by page, using a book the kernel keeps. Asking for memory just writes a reservation. You only really get it when you touch it. And Linux hands out more reservations than it can honour, so when everyone shows up at once, it can't fail politely. It kills the biggest process.

A: That's right. The piece I'd sharpen is what "biggest" and "full" really mean. It's not what you asked for, and it's not even all of what you're holding. It's the memory that has no copy anywhere else. File pages can always be thrown away and read back. Anonymous memory can't. So when you're asking "will this fit", the real question is, how much stuck memory am I making, and am I making it twice?
