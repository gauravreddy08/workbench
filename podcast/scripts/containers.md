<!-- section: The Problem -->

A: [relaxed, thinking out loud] Here's a little experiment you can do on the Spark. Start an Ubuntu container and ask it what operating system it is. It says Ubuntu. Start an Alpine container, ask the same thing, it says Alpine. Two different operating systems.

B: Sure, that's the point of containers.

A: Now ask each of them, and the Spark itself, which kernel version they're running. All three print exactly the same thing. The Spark's own kernel. Two operating systems, one kernel.

B: [puzzled] Huh. Okay, that's weird.

A: And then on your Mac, run the same container, ask for the kernel version, and it prints a Linux kernel. Even though macOS isn't Linux at all.

B: Okay, so I'll be honest about my picture. A VM comes with an operating system. A container... sort of doesn't? Or it does, but it's not the full thing. Like, it doesn't have the GUI.

A: That's a really common answer, and half of it is right in an interesting way. A VM really does come with an OS. And a container really does sort of come with one. You write "from Ubuntu" at the top of your Dockerfile, and inside, it says Ubuntu. But the GUI has nothing to do with it. Almost no server VM runs a desktop either. The real line is drawn much lower down. At the kernel. And once you see where it is, a whole pile of Docker trivia just falls out of one picture.

<!-- section: An operating system is two things -->

A: So when people say "Ubuntu", they actually mean two very different things stuck together. One is the kernel. That's the one big program that owns the hardware. It decides which process runs, hands out memory, runs the drivers. Everything else is called userland. The libraries, the shell, commands like ls, Python, the package manager, config files. Just ordinary programs and files.

B: And the distros are different in which part?

A: Almost entirely the userland. Ubuntu, Debian, Alpine, Fedora, they all run more or less the same Linux kernel. What makes them different is which libraries, which package manager, which versions of everything.

B: So "Alpine" is really a set of files.

A: Pretty much. And the two halves talk through one narrow doorway, called system calls. A fixed list of things a program can ask the kernel for. Open this file, give me memory, start a process, open a network connection. And Linux makes a promise to keep that doorway stable. A program built years ago still runs on today's kernel. That promise is the whole trick. Alpine's shell doesn't care whose kernel answers its requests, as long as it's a Linux kernel.

<!-- section: Two ways to get your own world -->

A: So now there are two ways to give three apps their own private worlds on one machine. One is, build three fake buildings. A virtual machine gives each app pretend hardware. A pretend CPU, pretend memory, a pretend disk. And on that pretend hardware it boots a whole operating system, its own kernel included. Three VMs, four kernels running. The host's, plus three.

B: And the other way?

A: Three fenced-off apartments in one building. A container is just ordinary processes running on the host's kernel, with a fence around them. The "operating system" that comes with a container is only the userland half. The files. Three containers, one kernel.

B: [working it out] So the corrected version of my answer is, a VM brings its own kernel, and a container brings only the files and borrows the host's kernel.

A: That's it exactly. That's the sentence. And it's why all three of them printed the same kernel version. There's only one.

<!-- section: Two histories -->

A: [warm] And the history makes sense once you see they came from opposite directions. VMs came first. In the sixties, IBM made one mainframe pretend to be many, so each user got their own whole private machine with its own operating system. Then the regular PC chip turned out to be awkward to virtualize, so VMware, in the late nineties, had to rewrite tricky instructions on the fly. Until Intel and AMD added hardware help, and Linux grew its own built-in support for running VMs.

B: And containers?

A: Containers came from the other side. Not "fake a machine", but "fence off a group of processes on a real one". Unix got a command way back in nineteen seventy-nine that changes what a process sees as the top of the file system. Then over the years, the Linux kernel grew the pieces of a real fence, one at a time. One of the big ones came from Google engineers, so Google could pack lots of jobs onto each machine without them starving each other.

B: So the kernel already had all of it before Docker.

A: All of it. Then in twenty thirteen, Solomon Hykes gave a five-minute talk showing Docker. And what it added was the missing piece: a simple way to package the files and ship them. The kernel features were already sitting there. Docker made them usable.

<!-- section: The three pieces of the fence -->

B: So what is the fence, actually? Like physically, in the kernel.

A: Here's the surprising part. There's no "container" thing in the kernel at all. There's no "create a container" request. A container is a normal process that was started with three separate kernel features switched on. And Docker is mostly a program that switches them on for you consistently, and ships the files. The first feature controls what a process can see. It's called a namespace. It takes one kind of global thing, say the list of running processes, and gives a group of processes their own private copy of it. So inside, your app is process number one, and it can't see anything on the host. There are namespaces like that for the network, for the hostname, for the file system's mount points, for users.

B: But it's still a process on the host. So does it have two process numbers?

A: It literally does. The kernel keeps one real list of processes. A process in its own namespace just has two numbers. Its real one, out on the host, some big ordinary number. And a small one inside, where it's number one. And when you build a container by hand, that's the moment that gets you. You start a shell in new namespaces, list the processes, and there's just you, as number one, and nothing above you. It feels like a whole machine, and it's just one shell with a different view.

B: Okay, and the second feature?

A: The second controls how much it can use. Namespaces only change what you see. They don't stop you eating all the memory or every core. That's cgroups, control groups. You put processes in a group and give the group a ceiling. This much memory, this much CPU time. Go over the memory ceiling and the kernel kills something in the group. That's what "OOM killed" means when a container dies.

B: Which is like giving a VM four gigs of memory.

A: Actually, it's different in a nice way. A VM with four gigs has four gigs of pretend memory, set aside. A container with a four gig limit has a ceiling. If it only uses a little, it only costs a little, and the rest is free for everyone else. And the third piece is the files. The container's "Ubuntu" or "Alpine". The container's root directory is really just some directory on the host. But copying a whole operating system's files for every container would be slow and wasteful. So images are made of layers. Each layer is a read-only snapshot of the files one build step added or changed. They're stacked on top of each other, and a running container gets one thin writable layer on top for its own changes.

B: So a hundred containers from the same image share all the lower layers.

A: They share all of them. Which is why a hundred containers cost almost no extra disk, and why a shared library gets cached in memory once instead of a hundred times. And if you crack a Docker image open, it's almost disappointing. It's a handful of archive files, one per layer, and a small settings file saying what command to run and for which kind of CPU. That's it. There's no kernel in there anywhere. Nothing boots.

<!-- section: Why the order of your Dockerfile matters -->

A: The layers also explain a thing that drives everyone mad. You change one line of your code, rebuild, and it takes two minutes reinstalling all your packages.

B: [laughs] Yes. Every time.

A: Because each layer is "changes on top of exactly that layer below it". So the moment one step changes, every step after it has to rerun. If you copy your code in before installing your packages, changing the code invalidates the install. Flip them. Install the slow, rarely changing stuff first, copy your code in last, and a code change rebuilds in about a second.

<!-- section: What falls out -->

A: And now the trivia starts falling out of the picture. Why does a container start in milliseconds and a VM in seconds?

B: Because the container doesn't boot anything.

A: Right. The kernel's already running. It's been running for weeks. Starting a container is basically starting a process with some extra labels. A VM has to really boot. Firmware, a bootloader, a kernel, probing all its pretend devices, starting services, then your app. And it has no idea it could skip any of that.

B: And the Mac thing? Why did it print a Linux kernel?

A: Because a container is Linux processes using Linux kernel features and making Linux system calls. The Mac's kernel has none of those. So Docker on your Mac quietly boots one small Linux VM, and runs every container inside it, all sharing that VM's kernel. Which is also why mounting a big folder from your Mac into a container is slow. Every file access crosses from the VM back out to macOS.

B: Oh. And the same thing with the CPU, I guess. It's shared too.

A: Right, a container shares the CPU just like it shares the kernel. Nothing translates instructions for it. So an image built only for Intel chips either refuses to run on the Spark, or runs under emulation, many times slower.

<!-- section: The fence and who guards it -->

B: [skeptical] Okay, but then is a container really as isolated as a VM? Because I'd have guessed they're about the same, just one's lighter.

A: That's the "lightweight VM" picture, and this is where it breaks. The kernel that everyone shares is the same thing that enforces the fence. So someone trying to break out of a container gets to poke at the entire system-call doorway. Hundreds of calls, decades of complicated code behind them. A bug anywhere in there can be a way out. Someone inside a VM owns a whole kernel, but that kernel can only talk to pretend hardware. They'd have to find a bug in the much smaller, much more carefully guarded hypervisor, the program that runs VMs.

B: So containers are fine for my own services, but not for running code I don't trust.

A: That's the rule of thumb. For code an agent or a model wrote, people reach for something stronger. A microVM, which is a stripped-down VM that throws away almost everything a normal VM pretends to have, so it still gets the VM-style fence but boots in about a tenth of a second.

<!-- section: The GPU -->

A: And the GPU is where this really matters for you. A GPU is driven by a driver that lives in the kernel. And a container shares the host's kernel. So it can't bring its own driver. There's only one.

B: So how does PyTorch in a container even see the GPU?

A: NVIDIA's container toolkit hands it over. When you ask for GPUs, it mounts the host's GPU devices and the host's matching driver library into the container right before it starts. Everything above that, the CUDA libraries, PyTorch, comes from the image. And there's one rule to remember. The image's CUDA version has to be one the host's driver supports. If an image needs a newer driver than you have, the fix is on the host, not in the container. Because the driver is the host's.

B: And that's why the Spark leans on NVIDIA's containers.

A: Right. It's an unusual machine. An ARM chip with a brand new GPU. For a while, regular pip installs of PyTorch often didn't have builds for that combination, and building it yourself is a long fiddly job. NVIDIA's containers ship PyTorch already built and tested for exactly that hardware. So on the Spark, a container is the main supported way to get a working GPU PyTorch.

<!-- section: Process number one -->

A: One last thing that bites people, and it falls straight out of the namespaces. Inside a container, your app is process number one. And on a normal Linux machine, process one is a special program with special jobs. One of them is about signals. The kernel protects process one from any signal it hasn't set up a handler for.

B: Meaning?

A: Meaning the polite "please shut down" signal does nothing to a Python server that never set up a handler. So you stop the container, and it just sits there for ten seconds until Docker gives up and kills it hard. No graceful shutdown, dropped requests. Either handle that signal in your app, which most servers already do, or tell Docker to put a tiny init program in as process one to pass the signals along.

<!-- section: Ending -->

B: Okay, let me try to say it back. A VM fakes a whole computer and boots its own kernel on it. A container is just processes on the host's kernel, with namespaces controlling what they can see, cgroups controlling how much they can use, and a stack of file layers giving them their own Ubuntu or Alpine. So it's like a lightweight VM that starts instantly.

A: That's all right, except the last bit. I'd drop "lightweight VM". It's not a smaller version of the same thing. It's a different thing. It's processes with a fence around them, and the fence is built by the same kernel everybody shares. That's why it starts instantly, why it can't bring its own GPU driver, why your Mac needs a hidden VM to run one, and why you think twice before putting untrusted code inside one.
