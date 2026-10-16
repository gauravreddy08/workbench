<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you want to try a seventy billion parameter model on the Spark. The full weights in B F sixteen are about a hundred and forty gigabytes, and the box has a hundred and twenty-eight. Doesn't fit. Fine. So you grab an eight-bit checkpoint instead, which is about seventy gigabytes. Plenty of room. You run free dash h, and it says something like a hundred and fifteen gigabytes available. And you write the obvious script. Torch dot load to read the weights into memory, build the model, load the weights into it, then dot to cuda to move it onto the GPU. Four lines.

B: [casual] Sounds fine to me. Seventy into a hundred and fifteen.

A: [slowly, setting the scene] It runs for a few minutes. The disk light's blinking. The desktop gets kind of sluggish, the mouse stutters. And then the terminal prints one word... "Killed." And your prompt comes back. That's it. No Python traceback. No memory error. No CUDA out of memory. You check the exit code and it's a hundred and thirty-seven. Nothing in your code caught anything, because nothing in your code was ever told. Something outside your process just decided it should stop existing.

B: [skeptical] Okay, but that's... weird, right? If I'd run out of memory, Python would've told me. It'd raise a memory error when the allocation failed.

A: You'd think so. And that's the first thing that should bother you. Python never raised a memory error because every allocation it asked for succeeded. Every single one. So who said no? And when?

B: And the numbers don't work either. A hundred and fifteen available, I needed seventy. Where'd the other forty-five go?

A: That's the second one. And the third: dot to cuda is supposed to put things on the GPU. Why would moving stuff to the GPU use up memory the CPU needs? So, three mysteries. And all three have the same answer. The addresses your program uses aren't real. They're a story that the kernel and the CPU tell each process. And the story has fine print. That's what we're going to read.

<!-- section: Origin -->

A: And the story starts in the nineteen fifties. Back then a computer had a small, fast main memory, and a big, slow magnetic drum next to it. Kind of like RAM and a disk. And if your program didn't fit in main memory, that was your problem. Literally. You split the program into pieces yourself, and you wrote code to swap the pieces in and out by hand. They called those pieces overlays. And there are estimates that programmers were spending something like half their time on that plumbing.

B: [surprised] Half? Just shuffling their own program in and out?

A: Half, by some estimates. So the team building the Atlas computer at Manchester, Tom Kilburn and his colleagues, had what was a pretty radical idea. Let the machine do it. Every program sees one big, uniform memory. The hardware chops that memory into fixed-size pieces called pages, and keeps a table of which pages are actually in the fast memory and which are out on the drum. And when a program touches a page that isn't in the fast memory, the hardware stops, fetches it, and carries on. The program never knows. That was nineteen sixty-two. They called it the one-level store. We call it virtual memory. And every phone, every laptop, every GPU server you've ever used works this way.

B: And the thing that killed my process?

A: [amused] That's the other end of the story. Unix made fork, the call that clones a process, cheap, by not actually copying the memory until somebody writes to it. And Linux went a step further. It lets programs reserve more memory than actually exists. It's betting most of it will never get used. And when the bet loses, something has to give. Since the late nineteen nineties, Linux's answer has been a routine inside the kernel that picks a process and kills it. That's the O O M killer. Out of memory.

<!-- section: The Idea: A hotel with fake room numbers -->

A: Okay, one comparison, because it maps really exactly. Picture a hotel where every guest is told, your rooms are numbered zero to a million, use whichever ones you like. Which is absurd. The hotel has five hundred rooms. But it works, because the front desk keeps a private book for each guest. "Guest A's room seven is really room two twelve. Guest A's room nine hundred thousand is really room thirty-one." The guest never sees the book. They walk to "room seven", and the desk quietly sends them to two twelve. And most guests only ever use a handful of rooms, so five hundred real rooms go a long way.

B: And if I book, like, fifty thousand rooms and never show up?

A: Then the desk writes "reserved" in your book and assigns nothing. A real room gets handed over only the first time you actually open the door. Hold on to that one. That's the whole first mystery.
So, the real names. The guest is your process. The fake room numbers are virtual addresses. Those are the addresses your program sees and uses. Every pointer in your program is one. Every NumPy array's data pointer, every Python object's address. The real rooms are physical memory, the actual RAM chips. And the front desk is two things working together. There's a piece of hardware in every CPU core called the M M U, the memory management unit, which translates every single memory access from virtual to physical. Every load, every store. And there's the kernel, which writes the books. And the book itself is called the page table.

B: [working it out] Every access? Like, every time my code reads a variable?

A: Every time. In hardware. We'll get to why that isn't ruinously slow. But first, connect it to stuff you've already seen. Remember drawing one process's memory as a long strip? The program's code at the bottom, the heap growing up from there, the stack growing down from the top, and this huge empty gap in the middle. That strip is the guest's view. It's room numbers. And the gap costs nothing, because nobody's assigned a real room to it. And the other thing: with processes, you saw that the same address in two different processes points at different RAM. Same number, different data. That's just two guests with two books. Guest A's room seven and guest B's room seven are different rooms.

B: Oh. So "each process has its own address space" just means... each one has its own book.

A: That's literally what it means.

<!-- section: The Idea: Pages -->

A: Now, the book can't have an entry for every byte. Think about it, each entry needs to hold an address, so the book would be bigger than the memory it describes. So memory gets translated in fixed-size chunks. Those chunks are pages, and on most Linux servers, the x eighty-six ones, a page is four kilobytes. Physical RAM gets chopped into slots of exactly the same size, called page frames, or just frames. A virtual page maps onto exactly one frame, or onto nothing if it isn't in RAM. And now the book only needs one entry per page, not per byte.

B: Is it always four kilobytes?

A: No, and this one actually matters for you. On x eighty-six Linux, four kilobytes. On your Mac, Apple Silicon, it's sixteen kilobytes. And on ARM Linux, which is what the Spark runs, it can be four, sixteen, or sixty-four kilobytes, and it's chosen when the kernel gets built. So it depends on how NVIDIA built the kernel for D G X O S. Some of NVIDIA's ARM server kernels use sixty-four kilobyte pages. Honestly, I'm not sure which one the Spark ships with. So don't trust me, ask the machine. There's a command, get conf page size. On the Mac it prints sixteen thousand three hundred eighty-four, which is sixteen kilobytes. Run it on the Spark and write the number down, because every calculation from here on depends on it.
So, how does an address get translated? It splits cleanly into two parts. Take four kilobyte pages. Four kilobytes is four thousand ninety-six bytes, and you can number every byte in a page with twelve bits. So the bottom twelve bits of an address say which byte inside the page. That's the offset. And everything above those twelve bits is the virtual page number, which page you're in. Translation is just: look up the page number in the book, swap it for a frame number, and keep the offset exactly as it was.

B: So byte one hundred of my page is byte one hundred of the frame.

A: [pleased] Exactly that. The offset never gets translated. Only the page number does.
Now picture the diagram for it. Across the top, one virtual address, with four kilobyte pages and forty-eight bits actually in use, the way x eighty-six does it. The low twelve bits are the offset, and the other thirty-six are the page number. And those thirty-six get cut into four slices of nine bits each. To the right there's a small box, the T L B, holding the last thousand to three thousand or so translations. The page number goes there first. If it's in there, that's a hit, and you're done in about one clock cycle. If it's not, an arrow drops down into a row of four tables, each with five hundred twelve entries. You start at this process's top-level table, use the first nine bits to pick an entry, that points you to the next table, the next nine bits pick an entry in that one, and so on, four levels down. The last entry holds the frame number. Then down at the bottom, the frame number plus the same offset, copied straight across, gives you the physical address. And off to the side, a little label. No valid entry? Page fault.

B: Four tables just to find one address? Why not one big array? Page number in, frame number out.

A: [working it out] Yeah, let's do the math on that, because it's the reason. Thirty-six bits of page number means about sixty-nine billion possible pages. Each entry is eight bytes. So one flat table would be about five hundred twelve gigabytes. Per process.

B: [laughs] Okay. That's not happening.

A: Not happening. So instead it's a tree. Four levels, each nine-bit slice indexes a table of five hundred twelve entries, which points to the next table down. And the trick is that whole branches of the tree can just be missing. That huge gap between your heap and your stack? No tables at all. So a typical process's page tables come to a few hundred kilobytes, up to a few megabytes. Not five hundred gigs.
Each of those entries is called a page table entry, a P T E. It's eight bytes, holding a frame number plus a few flag bits. The important flags are present, which means is this page in RAM at all, writable, can you store to it, and dirty, which means has anybody written to it since it was loaded. There are a couple more, like whether user code can touch it, and whether it's been accessed recently.

B: Is it ever big, though? The tree?

A: When you use a lot of memory, yes. Touch a hundred gigabytes with four kilobyte pages, and you need about twenty-six million page table entries. That's about two hundred megabytes of page tables, just to describe where your memory is. Which is one reason big-memory workloads use bigger pages. Hang on to that, it comes back.
And one more thing the tree gives you. Each process has its own tree. But threads inside one process share one tree. That's what "threads share an address space" actually means, in hardware. Two threads, one book. Two processes, two books.

B: [a bit sheepish] Huh. I always heard that phrase and kind of nodded along.

A: Now it's a concrete thing. One table, pointed at by both.

<!-- section: The Idea: The TLB -->

A: Okay, so, back to the slowness. If every memory access needed four extra memory reads to walk that tree first, programs would run several times slower. So each core keeps a tiny cache of recent translations. That's the T L B, the translation lookaside buffer. Terrible name. It's just "page numbers I looked up recently, and their frames". A hit costs about a cycle. A miss means walking the tree. And a modern core has a first level of a few dozen entries, and a second level of one to a few thousand. Those vary by chip, so treat them as rough sizes.
Here's a number worth having in your head, though. The T L B's reach. That's entries times page size, how much memory it can cover at once. Around fifteen hundred entries, times four kilobyte pages, covers about six megabytes.

B: [a bit stunned] Six megabytes. And the model is seventy gigabytes.

A: Seventy gigabytes. So every time a decode step streams through the weights, it blows through the T L B thousands of times over. Which is why the GPU's M M U, and serious CPU workloads, use huge pages. Those are pages much bigger than normal, usually two megabytes, sometimes a gigabyte. One two-megabyte page covers what five hundred twelve small pages would. So the same fifteen hundred entries now reach about three gigabytes instead of six megabytes. And Linux can even make them for you automatically. That feature's called transparent huge pages.

B: And if the Spark turns out to have sixty-four kilobyte pages?

A: Then reach is sixteen times bigger, for free. Which is another reason to run that command.

<!-- section: The Idea: Lazy allocation -->

A: Okay. Now the part that explains the first mystery. Why Python never raised a memory error.
When your program calls malloc, the C function for "give me memory", and asks for a hundred gigabytes, or you call N P dot zeros, or torch dot empty, it all ends up in the same place. The C library asks the kernel for address space with a system call called em map. M M A P. And em map just adds a new region to your process's address space. It can be anonymous, meaning plain memory that starts as zeros, or it can be backed by a file, meaning the region shows you that file's contents. Here it's anonymous. And the kernel does... almost nothing. It writes down one note. "Addresses from here to here plus a hundred gigabytes belong to this process, readable and writable, and they start out as zeros." And it returns. No frames assigned. No page table entries filled in.

B: [a bit unsure] Wait. But then malloc came back with a pointer. So as far as I'm concerned, I have a hundred gigabytes. The memory's mine, right? It's sitting there waiting for me.

A: That's the natural way to think about it, and it's the thing to unlearn. What you have is a promise. A range of room numbers with "reserved" written next to them. There's no RAM behind any of it yet. And there are two numbers that show the difference. One is V S Z, virtual size. That's the total of all the address ranges your process has reserved, touched or not. Top calls it VIRT. And V S Z just jumped by a hundred gigabytes. The other one is R S S, resident set size. That's how much of your process's memory is actually sitting in physical RAM right now. That's the number that matters for running out of memory. And R S S didn't move at all.

B: So V S Z is basically... how big the reservations are. Not how much memory it uses.

A: Right. V S Z is mostly meaningless as a measure of memory use. The real work happens later, one page at a time, the first time you touch each page.
So here's one to try. Your Mac has forty-eight gigabytes of RAM. You run N P dot zeros for a hundred gigabytes, a hundred-gig array of bytes. Does it succeed? How long does it take? What happens to R S S? And then you write a one into every element. What happens?

B: [working it out] I'd have said it fails, before this conversation. Now... it succeeds? Because it's just the note. Takes, I don't know, a fraction of a second. R S S stays small. And then when I write the ones... it starts actually using memory, and somewhere past forty-eight gigs it falls over.

A: That's basically it. It succeeds, in about a tenth of a millisecond. Measured on an M-series Mac with forty-eight gigs, zero point one one milliseconds. R S S stayed at twenty-eight megabytes. And there's a nice detail in there. N P dot zeros asks for zero-filled memory, and fresh anonymous pages from the kernel are already zero. So NumPy doesn't even have to write anything.
Writing the ones is a different story. Each first touch of a sixteen kilobyte page faults, the kernel finds a frame, zeroes it, maps it, and R S S climbs. Past forty-eight gigs of real RAM, macOS starts compressing pages and swapping them to disk, everything slows to a crawl, and eventually the system steps in. So, please, don't actually do it on the bare machine. There's a safe version later.

B: So that's the whole first mystery? Python never got told no because nobody ever said no to the allocation.

A: That's the first half of it. The no comes later, and it comes from somewhere else. And you can already see what this whole setup buys you. Three things. Isolation: a process can only reach frames its own book points to, so one program can't scribble on another's memory. The illusion of one huge, tidy, contiguous memory, no matter where the frames really are. And laziness. Memory can be promised now and backed later, shared between processes, or pushed out to disk, and the program never notices.

<!-- section: The Idea: Page faults -->

A: So what does "touch" actually mean, mechanically? Your code does a store to some address. The M M U walks the tree and finds no valid entry. Or it finds one that doesn't allow what you're doing, like a write to a read-only page. Either way, it can't finish the instruction. So it raises a page fault. That's a hardware exception. The instruction stops, the CPU jumps into the kernel, and the kernel looks up the address in its notes. Then it either fixes things up and retries the instruction, or it kills the process.

B: [skeptical] Fault sounds like an error, though.

A: It sounds like one, and mostly it isn't. Most faults are the lazy plan working exactly as designed. The kernel sorts them into three cases.
Case one: the address isn't in any region you reserved. You really did touch memory that isn't yours. The kernel sends you a signal called sig seg V. A segfault. That's exactly what you saw when you blew the stack and hit the guard page at the end of it.
Case two: it's in a region you reserved, and the data's already in RAM somewhere, or it's just supposed to be zeros. So, first touch of fresh memory. Or a page of a file that's already cached. Or a copy-on-write, which we'll get to. The kernel grabs a frame, or points at one that's already there, fills in the page table entry, and returns. Your instruction runs again and succeeds. That's a minor fault. No disk involved. It costs well under a microsecond up to a few microseconds.
Case three: it's reserved, but the data's on disk. Like a page of a memory-mapped file that isn't cached yet, or a page that got pushed out to swap. The kernel issues a read, puts your thread to sleep until the data arrives, maps it, and wakes you up. That's a major fault. Tens of microseconds on a fast N V M E drive, milliseconds on an old spinning disk.

B: And how much does a minor one cost, really? Like, measured?

A: Measured on the Mac. Filling a fresh four gigabyte NumPy array the first time took zero point two one seconds, so about nineteen gigabytes a second. And it took two hundred sixty-two thousand one hundred forty-nine faults. Four gigabytes divided by sixteen kilobyte pages is two hundred sixty-two thousand one hundred forty-four. So that's one fault per page, almost on the nose, plus a handful. Then fill the same array again, every page already mapped, and it's zero point zero eight six seconds. Forty-six gigabytes a second. Take the difference, spread it over the faults, and it's about half a microsecond per minor fault. Including zeroing a sixteen kilobyte page.

B: Half a microsecond. Is that a lot?

A: Put it on the latency ladder. A trip to RAM is about a hundred nanoseconds. So one minor fault costs about as much as five trips to RAM. Cheap, one at a time. But it adds up over millions of pages. And a major fault from an N V M E drive, tens of microseconds or more, is roughly a hundred times worse again.

<!-- section: The Idea: The interactive figure -->

A: There's a little toy that shows all of this at once, and it's worth describing what you'd see if you clicked through it. Two processes, A and B, with their virtual pages down the outside edges. In the middle, just six physical frames. That's the whole RAM. And buttons. Malloc, touch a page in A, fork A into B, touch a page in B, swap on or off, reset. Plus readouts for each process's V S Z and R S S, free frames, and counters for minor faults, major faults, copies, and O O M kills.
So you hit malloc twice. A's V S Z goes to four pages. R S S, zero. Not one frame used. Then you touch pages in A until it has four, and each touch is a minor fault that grabs a frame. Then you fork. And now B's R S S says four. But the free frames counter didn't move.

B: [working it out] So B is showing four pages it doesn't really... own.

A: It's sharing A's. And R S S counts them in both. So R S S double-counts shared pages. Keep that in your pocket, it matters a lot later. Then you touch pages in B with swap off, and you run out of frames. And the O O M killer kills whichever process has the most R S S. Then reset, turn swap on, and do the same thing. This time nobody dies. The kernel buys time by pushing the coldest private page out to disk. And when somebody touches that page again, it's a major fault, reading it back.

<!-- section: The Idea: Overcommit -->

A: So malloc is a promise, and the kernel makes the promise before checking if it can keep it. On Linux that policy is called overcommit. Letting processes reserve more memory than RAM plus swap can actually back. It's a setting you can read, in a file under slash proc, slash sys, slash V M, called overcommit memory. And it has three values.
Zero is the default, the heuristic mode. It only refuses requests that are obviously absurd. Roughly, a single allocation bigger than all of RAM plus swap. Everything else, granted. One is "always". Never refuses anything. Malloc a terabyte on a laptop, it says sure. And two is strict. The kernel keeps a running total of everything it's promised, and refuses once that total passes swap plus a fraction of RAM. The fraction's a setting too, and by default it's half. So swap plus half of RAM.

B: [skeptical] Why would you ever want zero, though? It seems obviously better to have the kernel just tell me no up front, when it can still say no nicely.

A: Because programs reserve way more than they use. Every thread reserves an eight megabyte stack and touches, like, a few kilobytes of it. And the big one is fork. Say a twenty gigabyte process forks to run a tiny shell command. Strict accounting would need another twenty gigabytes set aside, just in case the child writes to every page. Even though the child's about to throw all of it away and replace itself with the shell command. With overcommit, that fork just works.

B: [grudgingly] Okay. So the bet usually pays.

A: Usually. The cost is that the kernel has written more cheques than it can cash. If enough processes actually touch their memory at the same time, there's no frame for the next page that faults. And that fault can't fail politely.

B: Why not, though? Just return an error. Null, or whatever.

A: [jumping in] Because there's nothing to return to. Your program isn't calling a function at that point. It's in the middle of executing a store instruction. Write this byte to this address. There's no return value to put a null in. Malloc already returned, minutes ago. So the kernel has to make room. Right now.

<!-- section: The Idea: Reclaim, swap, then the killer -->

A: And it has a decision path for that. Picture a flowchart going down the page. At the top: touch an address. Is the translation valid? If yes, it just runs. If not, page fault. Is the address in a region you own? No, segfault, off to the left. Yes, keep going. Does it need a new frame? If not, say it's a file page already in the cache, just map it, minor fault. If it does need one, is there a free frame? Yes: zero it or copy into it, minor fault, or read from disk, major fault. No free frame? Now the interesting part. Step one, reclaim. Drop clean file pages. Still not enough? Step two, write anonymous pages out to swap. And if there's still nothing, at the very bottom, in the one dark box: the O O M killer sends sig kill to a victim.

B: What's the difference between those two? File pages and anonymous ones.

A: That's actually the key to your second mystery, where the forty-five gigs went. Not all memory is equal here. File-backed pages hold a copy of something that's on disk. The code of python three itself, shared libraries, a file you read, a file you em mapped. And Linux keeps recently read file data in RAM in something called the page cache. That's the kernel's in-memory copy of file data, shared by every process. It grows into whatever RAM is free and shrinks when programs need memory. And if a file page is clean, meaning unchanged since it was read, the kernel can just drop it. Throw it away. If anybody needs it again, read it from disk again. So those are cheap to reclaim.
Anonymous pages are memory with no file behind them. Your heap, your stack, NumPy arrays, every CPU tensor you made with torch dot load. There's no copy of them anywhere else. So the only way to free one is to write it somewhere first. And that somewhere is swap. Swap is disk space, a partition or a file, or even compressed RAM, something called Z RAM, where the kernel parks anonymous pages it needs to evict. And touching a swapped page later is a major fault. But if there's no swap, or it's full, anonymous memory can't be reclaimed. At all. It stays until the process frees it, or the process dies.

B: [working it out] Oh, so that's why free dash h has two columns. Free and available. I always assumed available was just free plus some rounding.

A: Free is RAM that literally nobody is using. And it's often small, because the page cache happily fills idle RAM. Available is the kernel's estimate of what it could hand you without swapping. So free, plus most of the reclaimable cache. Available is the number to believe. Your hundred and fifteen was available, and a lot of it was page cache that'd get dropped to make room.

<!-- section: The Idea: The OOM killer -->

A: So when reclaim can't keep up and swap's out, the kernel runs the O O M killer. It scores every process and kills the one with the highest score. And you can read the score yourself. Each process has a file under slash proc, under its process ID, called O O M score. It goes from zero to a thousand. In modern kernels it's roughly what fraction of memory that process is using, counting R S S, plus its swap, plus its page tables, scaled to a thousand. Plus an adjustment you can set, in a file called O O M score adj, from minus a thousand, which means never kill me, up to plus a thousand, which means kill me first.

B: So it just... kills the biggest one.

A: Pretty much. It's blunt on purpose. Killing the biggest process frees the most memory with the fewest deaths. And your seventy gig model loader was by far the biggest thing on the box.
And the victim gets sig kill. Signal number nine. The one signal a process can't catch, can't block, and can't clean up after. The kernel just stops it and takes back its memory. And a shell reports that as exit code a hundred and thirty-seven, which is a hundred and twenty-eight plus nine.

B: [surprised] Oh. That's where a hundred thirty-seven comes from.

A: That's it. A hundred twenty-eight, plus nine for the signal number. And that's why your script printed "Killed" and nothing else. Python never got a chance to raise anything. It was just gone. But there is a confession. It's in the kernel log, which you read with D message, D M E S G, or with journal C T L. You'd find a line that starts "Out of memory: Killed process", then the process number, python three, and then a few sizes. Total V M, which is the V S Z. And anon R S S, which is the real anonymous memory it was holding when it died. That's the one to look at.
One more killer to know about. On Ubuntu-based systems there's also systemd O O M D. It's not the kernel, it's a regular program running in the background, watching memory pressure, and it may kill a whole group of processes, like your whole terminal session or a whole service, before the kernel's killer ever runs. So if something dies and D message is silent, check that one's journal. Whether D G X O S has it turned on, I'm not sure. Check with system C T L status.

B: Hang on, can I check something with you. Say I open top and some process shows a V S Z of three hundred gigabytes and an R S S of four gigabytes, on a hundred twenty-eight gig machine. That's bad, right?

A: Not at all. V S Z is just address space reserved. Thread stacks, a big em map, the allocator's arenas, CUDA's reservations. None of that costs RAM until it's touched. R S S is what's actually in RAM, and four gigs is fine. What you'd actually watch is R S S, or better, a fairer version of it we'll get to when processes share pages. And specifically the anonymous part, since the file-backed part can be reclaimed. And how it grows over time. The only time V S Z matters is under strict mode, mode two, where the reservations themselves count against the limit.

<!-- section: The Idea: cgroups -->

A: Now, the global O O M killer protects the whole machine. But you can also draw a smaller box. A C group, control group, is a Linux feature that puts a set of processes in a group and limits or measures what they use together. Memory, CPU, disk I O. Docker's built on it, systemd's built on it. In version two of C groups, which is what modern Ubuntu uses, the memory limit lives in a file called memory dot max. Current usage in memory dot current. And a counter of kills in memory dot events.
When a group goes over its limit, it first tries to reclaim its own pages. And if that fails, the O O M killer runs on only that group. Nobody outside is touched. And the log line says "Memory C group out of memory" instead.
And Docker's memory flag, set to five hundred twelve megabytes, is exactly this. It puts the container in a C group with memory dot max set to five hundred twelve megabytes. Which is how you'll trigger the O O M killer later without risking the Spark. The explosion happens inside a half-gig box.

B: So in that box, if I try to malloc a gigabyte, the malloc fails.

A: [amused] No! Same trap. The kernel only charges what's resident. A container with a five hundred twelve megabyte limit can still malloc a hundred gigabytes. Lazy allocation works inside the box too. It's touching that gets you killed. The other thing that trips people up: page cache from files read inside the container counts against its limit too. But it's reclaimable, so usually it just gets squeezed.

<!-- section: The Idea: fork and copy-on-write -->

A: Okay. Fork. Quick reminder of where it sits. When a process forks, the child is a whole new process with its own address space, a copy of the parent's. That's how PyTorch's DataLoader workers usually get made. And copying twenty gigabytes every time you fork would make fork take seconds. So it doesn't copy. It copies the page table, the book, and then it marks every writable page as read-only in both the parent and the child.
So now both processes point at the same frames. Reads are free. No faults, no copies. And the first time either process writes to one of those pages, the M M U sees a write to a read-only page and faults. The kernel notices this is a copy-on-write page. It copies that one page to a fresh frame, gives the writer the copy with write permission, and resumes. So only the pages that actually differ get duplicated. That's copy-on-write. And for C programs it's beautiful.

B: [knowingly] But.

A: But for Python it has a nasty edge. So, here's one. The parent builds a list of five million Python ints, about two hundred megabytes of objects, and then forks a child. The child only reads the list. A for loop, for x in the list, pass. It never assigns anything. How much memory gets copied?

B: [casual, a bit unsure] Nothing? I mean, it's only reading. You just said reads are free. So it all stays shared.

A: Nearly all of it gets copied.

B: [skeptical] From reading.

A: From reading. Remember that every Python object starts with a header, and the first thing in the header is a reference count. How many names point at this object. When the loop binds x to an element, that element's count goes up by one. When it moves on, it goes back down. And each of those is a write. To the page holding that object's header. Five million objects packed densely on the heap means every page holding them gets written, so every page gets copied. In Python, reading an object is a write to memory.

B: Huh. So it's not my code writing. It's the interpreter, keeping score.

A: The interpreter keeping score. Now a NumPy array is different. Its five million numbers sit in one raw buffer, with one header for the whole array. Summing it reads the buffer and writes nothing. So the buffer stays shared.
On the Mac, the child going through the list took twenty-two thousand seventy-six page faults. That's about three hundred forty-five megabytes worth of sixteen kilobyte pages. But macOS takes a fault to map a page into the child and often another one to copy it, so that overcounts the actual copying. The NumPy sum took about twenty-five hundred faults, because macOS lazily maps pages into the child even just for reading. On Linux that should be close to zero copies. And on the Spark you'll get to measure the copies directly.
Picture it as a diagram. The parent on the left, the child, a DataLoader worker, on the right, physical frames in the middle. Up top, two NumPy buffer pages, with dashed lines from both sides into the same two frames. Shared, and they stay that way forever. Below that, a page of Python ints, and in the child's copy you can see the refcount getting bumped by one. And that one bump has split the page. The parent's frame is now private to the parent, and the child got a brand-new frame, a full copy. A whole page, four to sixteen kilobytes, copied, for an eight-byte change.

<!-- section: The Idea: The DataLoader leak that isn't -->

A: And this is the famous DataLoader memory leak. That isn't a leak. You build your dataset as a Python list of a million dicts of strings. You start eight workers. And over the first epoch, memory climbs to roughly nine times the size of the dataset. Each worker, just by indexing into the list, slowly copies every page it touches. Top shows every worker with a big R S S, and you panic.

B: Nine times. So I add up the eight workers' R S S plus the parent, and that's what I'm really using.

A: That's the other half of the trap, actually. R S S counts a shared page in every process that maps it. So adding up R S S across workers overcounts, especially right after the fork, when everything's still shared. Remember the toy, where B showed four pages and no frames moved? Same thing. The fairer number is P S S, proportional set size. It's like R S S, but each shared page gets divided by the number of processes sharing it. So if eight processes share a page, each one gets charged an eighth. Add up P S S across processes and you get the true total. Linux shows it in a file under slash proc called S maps rollup. And the honest "how much did this one process cost me" number is its private dirty memory. Pages that are only its own, and that it's written to.

B: [relieved] Okay, so it's not real.

A: [jumping in] No, no, the growth over the epoch is real. The copies really happen. The overcounting is a separate thing that makes it look even worse than it is. Both are true at once.
So the fix is to keep your data out of millions of Python objects. Store it in NumPy arrays, or Arrow tables, or a memory-mapped file, and index into those. Raw buffers stay shared. Or keep only file paths and offsets in Python, and read the actual data on demand. And there's one more twist. All of this only applies when workers are created with fork. If they're created with spawn or forkserver instead, the dataset gets pickled and fully copied into each worker right at the start. And Python three point fourteen changed the default way of starting processes on Linux, from fork to forkserver. So check what your DataLoader's actually using. Don't assume.

<!-- section: The Idea: mmap -->

A: Last tool. Em map, but with a file instead of anonymous memory. That creates a region whose pages are the file's pages in the page cache. So you touch byte four million of the region, and you get byte four million of the file. The first time, through a major fault if it has to read from disk, or a minor one if it's already cached. And every time after that, it's just a normal memory read.
And for model weights this changes everything about the accounting. A safe tensors file loaded with em map costs no anonymous memory at all. Its pages are clean file pages. They do count in R S S, as file R S S, but they're shared with every other process that maps the same file, and under pressure the kernel can just drop them instead of killing you. Because it can always read them again. Now compare plain torch dot load, without em map. That reads the file into freshly allocated anonymous memory. And now the same seventy gigabytes exists twice. Once in the page cache, from reading the file, and once in your heap. And only the page cache copy can be reclaimed.

<!-- section: The Idea: Unified memory -->

A: Okay, back to the Spark, and the third mystery.

B: Dot to cuda. Which, on a normal machine, I'd say is just copying to the GPU's own memory. The GPU has its own RAM, so it shouldn't touch the CPU side at all.

A: On a normal workstation, that's exactly right. The GPU has its own memory, VRAM, on its own board, and dot to cuda copies bytes across P C I express into that separate pool. And if you run out of VRAM, you get CUDA out of memory. A Python exception. You can catch it. System RAM is a different pool, with a different killer.
The Spark's chip, the G B ten, is built differently. The CPU and the GPU share one pool. A hundred twenty-eight gigabytes of L P D D R five X, at about two hundred seventy-three gigabytes a second. Those are spec-sheet numbers. There's no separate VRAM. A cuda malloc for the GPU and a plain malloc from Python come out of the same physical frames. Linux sees all of it as system RAM, and the GPU driver allocates its memory out of that same RAM. And you'll see a bit under a hundred twenty-eight show up in free, because firmware and the kernel keep some for themselves.

B: [working it out] Oh. So moving to the GPU isn't moving anything out of the way. It's allocating a second copy. From the same place.

A: That's it. Picture two horizontal bars, each one the whole hundred twenty-eight gig pool. The top bar is the naive load. A small slice for the OS, call it eight gigs. Then seventy gigs of anonymous memory from torch dot load. Then dot to cuda starts allocating another seventy for the GPU copy, and that runs right off the end of the bar. Eight plus seventy plus seventy is a hundred forty-eight. Doesn't fit. The page cache got squeezed out long ago, but two seventy-gig anonymous copies just can't fit in a hundred twenty-eight. O O M kill.
The bottom bar is the em map load. The OS slice, then seventy gigs of file pages, drawn dashed, because they're reclaimable. And then the GPU weights, seventy gigs. And as each tensor moves to the GPU, its file pages can be dropped. So at the peak you're holding one reclaimable copy plus one GPU copy, and that fits. All those sizes are approximate.
So now the opening scene makes sense, step by step. Torch dot load read the seventy gig file, which filled the page cache, and copied it into seventy gigs of anonymous memory. Fine so far. Available covered it, because the kernel quietly dropped page cache to make room. Then dot to cuda started allocating GPU memory, out of the same pool, while the CPU copy still existed. Somewhere past a hundred fifteen gigs of anonymous plus GPU memory, reclaim had nothing left to drop. There was little or no swap. And the O O M killer picked the process with the highest score. That was you. The cuda malloc didn't fail politely, because on unified memory the pressure lands on the whole system, not on some separate GPU pool.

B: So all three mysteries are the same thing. Nobody said no to the allocations because they were just promises. The forty-five gigs was page cache that got dropped, and then there was nothing else droppable. And the GPU was eating from the same plate.

A: That's all three. With one honest caveat. Exactly when the CUDA driver gives you a clean out of memory error, versus when the kernel kills the process, depends on how the driver allocates and pins memory on the G B ten. So watch for both.
And the fixes fall right out of the model. Never hold two full copies. Load with em map, so safe tensors, or torch dot load with em map turned on, and move the tensors to the GPU one at a time, so the file pages can be dropped as you go. Or load straight onto the device, with something like device map, or safe tensors with the device set to cuda. Or use four-bit weights, which come to about thirty-five to forty gigabytes, and leave room for a K V cache too. But that's really a memory math question, for another time. And whichever you pick, try risky loads inside a memory-limited box first, so if it fails, the failure stays contained.

<!-- section: Build It -->

A: So, building it. You do this first on the Mac, then on the Spark. The Mac shows you lazy allocation and page faults with sixteen kilobyte pages. The Spark shows you Linux's accounting through slash proc, plus overcommit, C groups, and the O O M killer.
Setup's quick. A virtual environment with NumPy, and a little probe module you import everywhere. It reports R S S, V S Z, and how many minor and major faults the process has taken so far. On Linux it reads all of that from your process's status file under slash proc, which also splits R S S into anonymous, file-backed, and shared, and tells you how big your page tables are. On the Mac it just asks P S. Then on each machine you write down the page size, and on the Spark, the overcommit mode, which you'd expect to be zero, and how much swap there is.

B: Anything weird on the Mac?

A: One thing. On macOS, V S Z starts out absurdly large. About four hundred sixty-six gigabytes for a bare Python. Because the system reserves a big shared region in every process. So ignore its absolute value, and only watch how it changes.
The first real one is the lazy test. You write a function that reserves a hundred gigabytes, an anonymous, private em map, and returns without touching it. Then a function that writes one byte into every page of the first two gigabytes and times it, and counts the faults. Touch the same two gigs again and compare. And two things matter. First, you have to pass the flags for private and anonymous yourself. Python's default, when there's no file, is a shared mapping, which Linux backs with shared memory and accounts for differently. It'd show up under shared R S S. Second, step by the real page size, not by four thousand ninety-six. On the Mac, stepping by four K touches each sixteen K page four times, but it only faults once.

B: So the check is basically that faults come out to bytes over page size.

A: Almost exactly. If it's way off, you're stepping wrong. On the Mac, touching two gigabytes, one byte per sixteen kilobyte page, took a hundred thirty-one thousand seventy-four minor faults. Two gigs over sixteen K is a hundred thirty-one thousand seventy-two. R S S went up to about two thousand sixty-four megabytes, and it took zero point one five seconds. The second pass: no new faults to speak of, and zero point one one seconds. So the loop itself is most of the time there, which is why there's also a NumPy version. A four gig array, fill it twice, and work out microseconds per fault from the difference. That's where the half a microsecond came from. And the reserve itself? Instant. R S S was sixteen megabytes before and after, and V S Z went up a hundred gigs. That's lazy allocation, in one line of output.
Then on the Spark, try reserving two hundred gigabytes with overcommit at zero. One request for two hundred gigs, on a hundred twenty-eight gig box with little swap, should be refused. You'd get "cannot allocate memory". While a hundred gigs is fine. That's the heuristic. Refuse only the obviously absurd.

<!-- section: Build It: copy-on-write -->

A: The second build is the copy-on-write one. The parent builds two things of the same length, a list of five million Python ints, and a NumPy array. And the ints are deliberately big numbers, around a billion, because Python caches small integers and shares them, and you want real separate objects. Then it forks a child for each test. One does nothing. One sums the array. One loops over the list. And one copies the array, which is a real write, as a control. Each child measures its faults, and on Linux, its private dirty memory from the S maps rollup file, before and after.
And one detail. In the child, exit with the low-level exit from the O S module, the one with an underscore in front of its name. Not the normal sys dot exit. Because sys dot exit runs Python's cleanup, and the cleanup writes to memory and muddies your numbers.

B: And what should the list one come out to on the Spark?

A: Work it out before you run it. Five million objects, each int is about thirty-two bytes, plus eight bytes for its pointer in the list. So five million times forty bytes, about two hundred megabytes. The sum should be near zero. And the array copy allocates forty megabytes of new memory. But that's fresh anonymous memory, not a copy-on-write, so check which counter it actually shows up in.
There's a bonus question, too. Python has a call, G C dot freeze, that you can make before forking. Does it help here?

B: [working it out] Freeze sounds like it'd stop things changing... so maybe?

A: It stops the garbage collector from writing to the headers of objects it tracks. But ints aren't tracked by the garbage collector in the first place. And the refcounts still change every time you touch one. So here, no, it doesn't save you. Good to predict before you run it, though.

<!-- section: Build It: the hog -->

A: The third build is the fun one. Triggering the O O M killer. And the rule is, do it on the Spark, inside a container. Never on the bare machine. The global O O M killer might pick your S S H session, your desktop, or somebody's training run instead of the thing you meant to kill.
So you write a hog. It allocates fifty megabytes at a time, and it has to actually touch it. A Python byte array of that size is zero-filled when it's made, so that counts as touching. It keeps every chunk in a list so nothing gets freed, and after each one it prints how much it's holding, plus the C group's own view: memory dot current and memory dot max. And it flushes every print, so you see the last line before it dies.
Then you run it in Docker with a five hundred twelve megabyte limit, and the swap limit set to the same number, which means no swap inside the box, so the kill comes fast. Afterwards you check three things. The exit code, which should be a hundred thirty-seven. Docker's own record of the container, which has an O O M killed flag that should say true. And D message, where you look for the "Memory C group out of memory" line.

B: And how close to five twelve does it get?

A: Near it, not exactly at it. Python itself, the interpreter's own pages, and any page cache charged to the container all count. So the last memory dot current it prints should be within one chunk, fifty megs, of memory dot max.
Then run a second copy slowly, with a half-second sleep per chunk, and watch it from outside. Find its process ID and read its O O M score every second. You'll watch the score climb as R S S grows.
And if you'd rather skip Docker, systemd can make the same kind of C group for you, with a memory max of five twelve and swap max of zero. That needs your user to be allowed to manage its own C groups, which recent Ubuntu allows by default. And when it works, have an agent review the hog for anything that could escape the box. Like writing big files into the host folder you mounted. And have it check your reading of the D message line.

<!-- section: Build It: the fake model load -->

A: The last build is the model load itself, at a safe size. Don't load a real seventy B. Make a fake one. About a sixteen gigabyte safe tensors file full of random B F sixteen tensors. Say sixty-four tensors of a hundred twenty-eight megabytes each. Then in separate runs, load it two ways. One reads the whole file into anonymous memory, the torch dot load way. The other uses safe tensors' own loading, which maps the file instead of copying it. Though check the docs on that, libraries change.
And then you compare anonymous R S S against file R S S between the two. While it's running, keep V M stat ticking once a second in another terminal, and watch the cache column, and the swap in and swap out columns.

B: I'd guess the first one's mostly anonymous and the second's mostly file.

A: That's what you're looking for. And then run each load a second time, right after the first. Is the second one faster?

B: Yeah, because... the file's already in the page cache. So it doesn't have to come off the disk again.

A: That's the page cache, and it's the start of the next lesson's story, what happens when you save a file. Then for the GPU half, move the tensors to cuda one at a time and watch free. On unified memory, the GPU's share just shows up as system memory being used. And N V I D I A dash S M I, the usual GPU monitor, may not report a normal memory-used number on the Spark. Check.
And you're done when the hundred gig reserve is instant on both machines, and you can point at V S Z jumping with R S S flat, then R S S climbing with faults about equal to bytes over page size. You've got a microseconds-per-fault number for each machine. The fork test shows the sum staying shared and the list getting copied, within about twenty-five percent of your prediction on the Spark. You've seen a hundred thirty-seven, O O M killed true, the C group line, and the score climbing. And for the fake model, you can say how much of R S S was anonymous versus file-backed, and why that matters.

<!-- section: Measure -->

A: So what should those numbers tell you? Reserving is free, touching costs. And faults coming out to bytes over page size is the proof that memory really arrives one page at a time, on first touch.
And a minor fault costs about half a microsecond to a microsecond. Which is cheap per page, and expensive in bulk. So here's where it starts to matter. Touching seventy gigabytes of fresh memory with four kilobyte pages is about eighteen million faults. At roughly half a microsecond each...

B: [working it out] Eighteen million times half a microsecond... nine seconds?

A: About nine seconds of pure fault handling, before you've done anything useful. With sixty-four kilobyte pages, it's one point one million faults instead. So page size matters once the numbers get big, which is why your Spark number is the one to compare.
The copy-on-write numbers should say: copy-on-write is about writes, and in Python, reads are writes. On Linux, the array sum copies essentially nothing. The list loop copies roughly the full two hundred megabytes of objects. And on the Mac, for reference, the forked children took twenty-six faults for doing nothing, about twenty-five hundred for the sum, and twenty-two thousand for the list.

<!-- section: Break It -->

A: Then you break it. Four ways. First: in the five twelve megabyte container, ask for ten gigabytes of zeros with NumPy. Then ask for ten gigabytes of ones. Same size.

B: [confident] Both die. Ten gigs in a half-gig box.

A: [amused] The zeros one survives, holding almost nothing. The ones one dies. Same size, same allocation call underneath. But ones has to write every byte, and every written page gets charged to the C group. Zeros never has to write anything, because fresh pages are already zero. So "how big is my array" is the wrong question. "How much of it have I touched" is the right one.
Second: make yourself the preferred victim. Run two hogs in one container with a one gigabyte limit. One of them, before it starts, writes a thousand into its own O O M score adj. Raising your own score needs no special permission. Lowering it does. Let them grow at the same rate. The adjusted one dies first. Even when it's the smaller one.

B: [skeptical] Why would anyone volunteer to die first?

A: Because that's how systemd and Kubernetes steer the killer. Away from the important processes, and toward the expendable ones.
Third: thrash. Run the hog in a container with five twelve megs of RAM and a swap limit of two gigs, so a gig and a half of swap. And change the hog so after every new allocation, it cycles through all its chunks, reading one byte per page. Now it doesn't die quickly. It just gets slower. And slower. And V M stat on the host shows swap traffic pegged. That's thrashing. The pages a program needs keep getting pushed to swap and pulled back, so the machine spends nearly all its time moving pages around instead of computing.

B: [skeptical] Still, that's better than getting killed, right? At least it's alive.

A: Usually it's worse. And that's why a lot of ML boxes run with little or no swap. A fast, clean O O M kill beats a training job crawling along at one percent speed for hours. This one needs swap on the host, though. If the Spark has none, just think it through instead of running it.
Fourth: the fake leak. Fork eight children that each loop over the list and then sleep. Add up their R S S. Then add up their P S S, from the S maps rollup file, and compare both with how much free says actually got used. R S S overcounts the shared pages. P S S and free agree. Then swap the list for the NumPy array, and the per-child growth just vanishes.

<!-- section: Scaling -->

B: Okay, so how does all this scale? If I touch one gig, ten gigs, a hundred gigs, with four K pages versus sixty-four K?

A: So, R S S just grows in a straight line with how much you touch. Doesn't care about page size. What changes is all the bookkeeping. Faults are bytes over page size. So a hundred gigs is about twenty-six million faults at four K, and about one point six million at sixty-four K. At around half a microsecond each, that's about thirteen seconds versus under one. Page tables are about eight bytes per page, so about two hundred megabytes at four K, versus about thirteen at sixty-four K. And T L B reach, fifteen hundred entries, is about six megabytes at four K versus about ninety-six megabytes at sixty-four K. So far fewer misses when you're streaming through big tensors.

B: [casual] So bigger pages are just better.

A: For big memory, mostly. But they cost something too. More waste for small allocations, because touching one byte costs you a whole page. And more copying on every copy-on-write fault, because the kernel copies the whole page for an eight-byte refcount change. That trade is why big-memory systems lean toward huge pages.

<!-- section: Go Deeper and Connections -->

A: If you want the slow version with exercises, the paging chapters of Operating Systems: Three Easy Pieces are free and excellent. And Ulrich Drepper's "What Every Programmer Should Know About Memory" does the T L B from the hardware up. And next, the page cache and em map come back from the other side, when you look at why the second model load is faster. Then there's the memory math for whether a model fits in a hundred twenty-eight gigs at all. And it turns out that five twelve megabyte box you built is most of what a container actually is.

<!-- section: Close -->

B: [working it out] Okay, let me try the whole thing. My program never had real memory, it had a range of addresses, and the kernel only finds real RAM for a page when I first touch it. So malloc can't fail, it's just a promise. And if everyone cashes their promises at once, and there's no clean page cache left to throw away and no swap, the kernel kills the biggest process. And on the Spark the GPU is just another process cashing promises from the same pool.

A: [gently] Mostly. Two sharpenings. Malloc can fail, it's just that by default Linux only refuses the absurd ones. A two hundred gig request on a hundred twenty-eight gig box with little swap gets turned down. It's the reasonable-looking ones that get you, because the no doesn't come at malloc time. It comes later, at a store instruction, where there's no way to say no politely. So instead of an error, you get a kill. And the GPU isn't really a process. It's the driver allocating out of the same physical frames your Python heap uses. So two copies of the weights isn't a GPU problem or a CPU problem. It's one pool, holding the same seventy gigs twice.
