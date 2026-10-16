<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, containers and virtual machines. You use Docker for basically everything you ship. So let me just ask it straight. What's the difference between a container and a VM?

B: [a bit unsure] Okay, gut answer. A VM comes with an OS. A container doesn't... well, I mean, it sort of comes with one, but it's not a GUI? I think that's the difference. The VM's got the whole desktop thing and the container's stripped down.

A: That's a really common answer. And half of it's right, in an interesting way. A VM really does come with an OS. And a container really does sort of come with one too. You write "from ubuntu twenty-four oh four" at the top of a Dockerfile, you go inside the container, you ask it what operating system this is, and it says Ubuntu. So which is it? Does it come with an OS or not?

B: That's... yeah, that's exactly why I hedged.

A: [leaning in] So here's a scene that makes it bite. On the Spark, you run an Ubuntu container and ask it two things. What distro are you, and what kernel version are you running? Then you do the same with an Alpine container. Then you ask the Spark itself, no container at all, just the kernel version. The first one says Ubuntu. The second one says Alpine. And all three kernel versions are exactly the same. Character for character. They're the Spark's own kernel.

B: [skeptical] Wait. Two different operating systems, and the same kernel?

A: [amused] Two different "operating systems", in quotes, one kernel. And then it gets weirder. Do the same thing on your Mac, and the container prints a Linux kernel version. On a Mac. And macOS isn't Linux at all. So hold onto that one, we'll come back to it.

B: Okay, so where does the GUI part go wrong?

A: GUIs just have nothing to do with it. Almost no server VM runs a GUI either. Like, an E C two box doesn't have a desktop. And you can run GUI apps inside containers if you really want to. The real line is drawn way lower down. At the kernel. And once you see where it is, a whole pile of things that look like Docker trivia just fall out of one picture. Why images are small. Why containers start instantly. Why you can't run a Windows container on Linux. Why "container escape" is a scary phrase. And why the Spark needs special containers just to get PyTorch working on its GPU.

<!-- section: Origin -->

A: And the history is actually two different answers to the same request. The request is, "give everyone their own machine." Virtual machines came first. Back in the nineteen sixties, IBM had these systems called C P forty and C P sixty-seven that let one mainframe pretend to be many. Each user got a whole private, virtual System three sixty, with its own operating system on it. Then in nineteen seventy-four, two researchers, Gerald Popek and Robert Goldberg, wrote down exactly what a CPU has to do to be virtualised efficiently. Like, the formal requirements.

B: And presumably some chip failed them.

A: [amused] The PC's chip, famously. x eighty-six failed their test. So when VMware showed up in nineteen ninety-nine, it had to rewrite the tricky instructions of the guest operating system on the fly, while it was running. Which is wild, honestly. And that lasted until Intel added hardware support, V T X, in two thousand five, and A M D did their version, A M D V, the year after. And then Linux grew K V M in two thousand seven. We'll get to what that is.

A: [relaxed] Containers came from the opposite direction. Not "fake a whole machine", but "fence off a group of processes on a real one". Unix got a call named C H root, change root, in nineteen seventy-nine. It changes what a program sees as the top of the filesystem. Then FreeBSD jails in two thousand, and Solaris Zones in two thousand four, added real fences. On Linux the pieces showed up one at a time. Mount namespaces in two thousand two. Then two Google engineers, Paul Menage and Rohit Seth, built something they called "process containers". It got renamed C groups and merged into Linux in two thousand eight, and the reason was that Google wanted to pack lots of jobs onto each machine without them starving each other. That same year, a project called L X C glued the pieces together. And then in twenty thirteen, Solomon Hykes gave a five-minute talk at PyCon showing Docker.

B: Five minutes?

A: [warmly] Five minutes. And what Docker added was the missing piece, which wasn't a kernel feature at all. It was a simple way to package the files and ship them around. The kernel features were already sitting there. Docker made them usable.

<!-- section: The Idea: An OS is two things -->

A: So to see where the line actually is, you have to notice that when people say "Ubuntu", they mean two very different things stuck together. The first is the kernel. That's the core of the operating system, one big program that runs with full control of the hardware. It schedules processes, it hands out memory, it runs the drivers, and it does everything a program asks it for. Everything else is called userland. The C library, the shell, little commands like L S and C P, Python, the package manager, all the config files in slash E T C. Just ordinary programs and files.

B: [working it out] So userland is basically... everything that isn't the kernel.

A: Yeah, that's a fine way to put it. And here's the thing. Ubuntu, Debian, Alpine and Fedora all run, more or less, the same Linux kernel. What makes them different distributions is almost entirely their userland. Which C library they use, which package manager, which versions of everything, what's sitting in slash E T C.

B: [working it out] Oh. So when the Ubuntu container says "I'm Ubuntu", it's really just... the files are Ubuntu's files.

A: That's where we're headed. But first, how do the two halves talk? Through one narrow doorway, called system calls. It's a fixed list of requests a program is allowed to make to the kernel. Open a file. Read some bytes. Give me memory. Start a process. Open a socket. Linux has a few hundred of them. So when Python opens a file, deep down it executes an instruction that basically says, "kernel, please do open-at on this path", and the CPU jumps into kernel code to do it.

A: [emphatic] And Linux makes a promise about that doorway. It keeps it stable. A program compiled against Linux's system calls from twenty ten still runs on today's kernel. And that promise is the whole trick behind containers. Alpine's shell doesn't care whose kernel answers its system calls, as long as it's a Linux kernel.

B: So the userland from one distro can sit on top of basically any recent Linux kernel.

A: Yeah. And one comparison, building on the processes episode, where a process was a kitchen with its own walls and pantry. Zoom out one level. The kernel is the building. The plumbing, the electricity, the gas lines, the landlord. Userland is the furniture and the stocked pantry. And a distro is just a particular furniture set.

<!-- section: The Idea: Two ways to give an app its own world -->

A: So now say you've got three apps and one machine, and you want to give each app its own private world. There are two ways to do it.

A: One is, build three fake buildings. That's a virtual machine. A complete pretend computer, made in software. Virtual CPU, virtual RAM, virtual disk, virtual network card. And on that pretend hardware it boots a whole operating system, its own kernel and its own userland, and that OS honestly believes it's on real hardware. So three VMs on your machine means four kernels running. The host's, plus three guests.

A: The other way is, put three fenced-off apartments in one building. That's a container. It's just a group of ordinary processes running on the host's kernel, and the host kernel shows them a restricted, private view of the system. Their own files, their own process list, their own network. And it caps how much CPU and memory they get. No kernel of its own. The "OS" that comes with a container is only the userland half. The files. So three containers means one kernel.

B: Okay, so let me redo my answer. A VM comes with a whole OS, kernel included, running on fake hardware. A container only brings the files of an OS and borrows the host's kernel.

A: [pleased] That's it. That's the corrected version. And the Ubuntu-versus-Alpine scene is now obvious. Both containers brought their own furniture. Neither brought a building. So they both report the Spark's kernel, because that's the only one there is.

A: If you drew it, picture two stacks side by side. Same bottom on both, the hardware. On the left, the VM side, there's the host kernel, then a hypervisor on top of that, which we'll get to in a second, and then it splits into three columns. Each column is virtual hardware, then a guest kernel, then a userland, then the app on top. Count the kernel boxes on that side and you get four. On the right, the container side, it's hardware, then one host kernel, and right on top of that, three little columns that are just two boxes each. Image files, and the app. Each pair has a dashed line drawn around it, which is the fence. And off to the side is a box labelled runtime. That's Docker's machinery. Count the kernels on that side. One.

B: Why's the fence dashed?

A: Because it's not a layer of software at all. It's a set of labels the kernel attaches to those processes. Which numbering of processes they see, which mount table, which network, which hostname, which cgroup is limiting them. It costs almost nothing. And the runtime box is off to the side, not in between, on purpose. Docker unpacks the image, asks the kernel to set things up, starts your process, and then gets out of the way. Once your app's running, it talks to the kernel directly. Nothing's sitting between them. And one more thing worth noticing in that picture. There's no init system in the container column. On a normal Linux box, the very first process is a program called system D, which manages everything else. In a container there usually isn't one. Your app is the first process. Hold onto that, it causes real trouble later.

A: And there's a fourth version of the picture, Docker on a Mac. But let's earn it first.

<!-- section: The Idea: How a VM pretends -->

A: So how does a VM actually pull off the pretending? A kernel expects to be the boss of the hardware. It wants to write the CPU's page tables, which are the maps from a program's addresses to real memory. It wants to catch every interrupt. It wants to talk to the disk controller directly. If you just ran a second kernel as a normal program, the first kernel would, rightly, not let it do any of that.

B: So how does the guest kernel run at all?

A: With help from the CPU. You need a program called a hypervisor. It's the thing that creates and runs virtual machines. It sits underneath the guest kernels and decides what each one gets, the same way a kernel decides what each process gets. And modern CPUs have an extra privilege level, above the kernel's, just for it. On ARM, which is what both the Spark and your Mac are, these levels are called exception levels. Apps run at E L zero. A kernel runs at E L one. The hypervisor runs at E L two. So the guest kernel runs at E L one inside its VM, and it does normal kernel things freely, fast, on the real CPU. But the moment it touches something it doesn't really own, like a hardware register or the disk, the CPU traps. It jumps up to the hypervisor at E L two. The hypervisor fakes the right answer and resumes the guest. And the guest never knows it happened.

B: [amused] So the guest kernel thinks it's the boss, and it's actually being managed the whole time.

A: Pretty much. Hypervisors come in two classic flavours. Type one runs directly on the bare hardware, no normal operating system underneath. Xen, VMware E S X i, Microsoft Hyper-V. Cloud machines, an E C two instance, a Google Cloud VM, those live on type one hypervisors. Type two is an app on your normal desktop OS. VirtualBox, VMware Fusion, Parallels, U T M on a Mac.

A: And then Linux blurs the line with K V M. Kernel-based Virtual Machine. It's a part of the Linux kernel, since two thousand seven, that uses the CPU's virtualisation support to run guests. So the Linux kernel itself becomes the hypervisor. And a normal program, usually one called Q E M U, supplies the fake devices. The fake disk, the fake network card. So from the host's point of view, each VM is just one Q E M U process. If you run P S on a K V M host, you see each VM as a process with as much memory as that guest was given. And people argue about whether that counts as type one or type two. Honestly, the useful thing is the shape, not the label.

B: What does all that cost you, though?

A: A few things. The guest's RAM gets reserved up front. Give a VM four gigabytes and the host sets aside up to four gigabytes for it. Each guest kernel keeps its own caches and its own copy of every library it's loaded. And starting one means booting. Firmware, then a bootloader, then the kernel, then probing all the virtual devices, then an init system, then its services. Seconds at best. Often tens of seconds.

A: And what it buys you is real. It's the strongest common isolation boundary there is. And you can run any OS at all. A Windows VM on a Linux host? Totally fine.

B: But not a Windows container on Linux.

A: Impossible. A Windows program makes Windows system calls, and there's no Windows kernel there to answer them. The container borrows the host's kernel, and the host's kernel is Linux.

<!-- section: The Idea: Three kernel features -->

B: [a bit unsure] Okay, but on the container side, I still kind of picture a container as a thing. Like, a lightweight VM object that the kernel knows about.

A: [firmly] That's the picture to drop. There's no such thing as a container object in the Linux kernel. There's no "create container" system call. A container is a normal process that was started with three separate kernel features turned on. And Docker is mostly a program that turns them on for you in a consistent way, and ships the files. Three features. One changes what the process can see, one limits what it can use, and one gives it its files.

A: The first is namespaces. A namespace takes one kind of global thing in the kernel and gives a group of processes their own private copy of it. So they see their own version and can't see anyone else's. And each kind is separate, so you can mix and match. There's one for process numbers, the P I D namespace. Inside it, your first process is P I D one, and you can't see or signal anything on the host. Quick reminder from the processes episode, a P I D is just the number the kernel gives each running program so it can track it. There's a mount namespace, so you get your own mount table, your own slash, and mounting things in there doesn't touch the host. A network namespace gives you your own network interfaces, your own IP addresses, your own ports, your own routing table. One called U T S, which is really just the hostname, so renaming yourself only renames you. One called I P C for shared memory and message queues between processes, so you can't poke at anyone else's. A user namespace, which is a strange one. You can be root, user number zero, inside, while you're just an ordinary user, say user one thousand, outside. And a cgroup namespace, which means you see your own group as the top of the tree. We'll get to cgroups next.

B: So for the P I D one, does the kernel make a second process table for the container?

A: [enthusiastic] No, and this is the part that's actually kind of beautiful. The kernel keeps one real process table. A process in a new P I D namespace just has two numbers. Its real one, on the host, and a small one, inside. And the inside view only shows its own little subtree.

A: Picture it as two lists side by side. On the left, the host's view, everything. System D at P I D one. Under it, S S H D, the thing that handles SSH logins, at eight hundred twelve. Your bash shell under that at four thousand one hundred. Then a program called unshare, which is what makes the namespaces, at four thousand one hundred twenty. And under that, shaded, a shell at four thousand one hundred twenty-one and a sleep command at four thousand one hundred thirty. On the right, inside the box, there are only two lines. That same shell, and it says P I D one. The sleep, P I D two. And nothing else exists from in there. No system D, no S S H D, no four thousand one hundred. Same processes, two numbers each. And every other namespace works the same way, for mounts, network, hostname, users. Each one a private copy of one global thing.

B: Can you actually see which namespace a process is in?

A: Yeah, as files. Under slash proc, then the process's number, there's a folder called N S. One link per namespace, each with an ID number. Two processes are in the same namespace exactly when those numbers match. And that tells you what docker exec really is. It's "start a new process and join it to the namespaces of that existing one". There's a system call for it, set N S, and a command, N S enter.

B: [surprised] Oh. So docker exec isn't, like, connecting into the container somehow. It's just a new process that gets the same labels.

A: [a little ominous] That's all it is. And one more thing about P I D one. Being P I D one is a special job, and it bites people. On a normal Linux box, P I D one is system D, which adopts processes whose parents died, and handles signals really carefully. In a container, P I D one is usually your app. Which was never written to do that job. We'll break that on purpose later.

<!-- section: The Idea: cgroups -->

A: So namespaces control what you can see. But they don't stop you using all hundred and twenty-eight gigabytes of the Spark's memory, or every core. That's the second feature. A cgroup, short for control group. It puts processes into a named group, enforces limits on what that group uses, CPU time, memory, disk I O, how many processes, and it counts what they actually used.

A: And on modern Linux, which is cgroup version two, which is what DGX OS and Ubuntu use, cgroups are just a filesystem. Under slash sys, slash F S, slash cgroup. Making a group is making a directory. Setting a limit is writing a number into a file. Putting a process in the group is writing its P I D into a file called C group dot procs. And its children inherit the group automatically.

B: [amused] So it's literally just make a directory and echo a number.

A: Literally. There are a few files you'll actually use. Memory dot max is a hard limit, in bytes. Go over it and the kernel first tries to reclaim memory from the group. And if it can't, the out-of-memory killer, the O O M killer, which is the part of the kernel that picks a process and kills it outright to free memory, kills a process in that group. That's what "container was O O M killed" means in Kubernetes. And it's exactly what docker run with a memory flag of four gigabytes sets.

A: Then C P U dot max, which is two numbers. A quota and a period, in microseconds. If you write fifty thousand and a hundred thousand, that means at most fifty milliseconds of CPU time in every hundred milliseconds. Which is half a core. And docker run with "C P U s zero point five" writes exactly that. Those exact two numbers. And then there are files that tell you what happened. Memory dot current, C P U dot stat, memory dot events. How much the group used, and how many times it hit the limit or got O O M killed.

B: Okay, so if I give a container four gigabytes, that's four gigabytes the machine has set aside for it. Same as the VM.

A: [firmly] No, and this is the important difference. A VM with four gigabytes has four gigabytes of pretend RAM, reserved. A container with a memory max of four gigabytes has a ceiling. If it only uses two hundred megabytes, it costs two hundred megabytes, and the rest is free for everyone else.

B: So it's a limit, not a reservation.

A: A limit, not a reservation.

<!-- section: The Idea: Layered filesystem -->

A: The third feature is the files. The "Ubuntu" or the "Alpine" that comes with the container. The oldest trick for that is change root, from that nineteen seventy-nine Unix. You point a process at a directory full of some OS's userland and say, "this directory is slash now". That's all it changes, just the filesystem view. And a root process can escape it. Modern runtimes use a sturdier cousin called pivot root, inside a mount namespace. But the idea's the same. The container's slash is just some directory on the host.

B: So every container gets a copy of the whole Python image in its own directory?

A: That'd be the obvious way, and it's slow and wasteful. Copying a hundred and twenty megabyte Python image into a fresh directory for every container. So instead, images are made of layers. Each layer is a read-only snapshot of the file changes made by one build step. Really it's a tarball of the files that one step added, changed or deleted. An image is a stack of them. And they get stacked with something called a union filesystem, which shows several directories on top of each other as one merged directory. If the same file is in two layers, the higher one hides the lower one. On Linux, that's overlay F S, built into the kernel since version three point eighteen, in twenty fourteen.

A: And the rules are short. Each image layer is a read-only directory. Those are called the lower layers. Each running container gets one empty, writable directory on top, called the upper. When you read a file, it falls through the stack and finds the topmost copy. When you write to a file that lives in a lower layer, overlay first copies the whole file up into the writable layer, and then changes the copy. That's called copy-up. The original layer is never touched. And when you delete a file from a lower layer, it can't actually delete it, because that layer's read-only. So it puts a marker in the upper layer that says "this path is deleted", and hides the lower file. That marker's called a whiteout. Inside an image tarball, it shows up as an empty file whose name starts with dot W H dot, then the original name.

A: So picture it bottom to top. Bottom layer, a Debian base. It has the shell, and some old log file. Above it, the layer from pip install, which has numpy. Above that, the layer from copying your code, which has serve dot py. All three read-only. Then the container's own thin writable layer on top. Now, your running app edits serve dot py. So a copy of serve dot py appears in that top layer. And it deletes the old log, so a whiteout for the log appears in the top layer too. And then the merged view, the thing your app actually sees as slash, shows the shell from the bottom, numpy from the middle, the edited serve dot py from the top, and the old log... just gone. Hidden. Even though it's still sitting there in the bottom layer, untouched.

B: [working it out] So a hundred containers from the same image are sharing all those lower layers on disk.

A: Right, and each one just gets a tiny upper layer. So a hundred containers cost almost no extra disk. And it's better than that, because of the page cache. That's the kernel's in-memory copy of recently read files, the reason reading the same file a second time comes from RAM instead of disk. Lib python, the shared library for Python, from a shared layer, is one file on disk. So it's cached in RAM once, not once per container. A hundred VMs each have their own disk image and their own guest page cache, and they cache it a hundred times.

<!-- section: The Idea: What a Docker image really is -->

A: So try this one. You pull python three twelve slim. Without looking anything up, what physical things is that image actually made of? Is there a kernel in it anywhere? Roughly how many pieces, and how big?

B: Hmm. Honestly, before today I'd have said it's a stripped-down Debian, kernel and all, compressed. Now I'd guess... no kernel. Just files. Maybe it's one big archive of a filesystem?

A: Closer to the second. An image is a handful of tarballs and a couple of JSON files. That's all. No kernel. Nothing that boots. There are a few layer tarballs, one per build step that changed files. For python three twelve slim, only a handful, on the order of four or five. A Debian base, some packages, Python itself, a small final tweak. Each one is a tar of the files that step added or changed, usually gzip compressed, and named by the S H A two fifty-six hash of its contents. So the name is a fingerprint of what's inside.

A: Then there's one config file, in JSON. It says the default command to run, the environment variables, the working directory, which user to run as, the CPU architecture, so arm sixty-four or A M D sixty-four, and the ordered list of layer hashes. And then one manifest file, also JSON, that points at the config and the layers by their hashes. And for images that support several CPU architectures, there's an index on top that points at one manifest per architecture.

B: And size?

A: Around forty to fifty megabytes compressed, a bit over a hundred unpacked. Roughly. You'll check it yourself. Compare that to a minimal Ubuntu cloud VM disk image, which is several hundred megabytes, and does contain a kernel, a small startup filesystem the kernel loads first, and a bootloader.

A: And that format is a standard. The O C I image spec, from the Open Container Initiative. So the same image runs under Docker, Podman, container D, or Kubernetes. And because layers are named by their hash, a registry, or your disk, only ever stores each layer once, no matter how many images use it. That's why when you pull a second image that's built on python three twelve slim, it only downloads the layers that are new.

A: So then, when you type docker run, here's roughly what happens. First, make sure all the image's layers are on disk. Pull whatever's missing, unpack them into directories. Second, mount an overlay. Those layers as the read-only lowers, plus a fresh empty upper. Third, ask the kernel for new namespaces, process numbers, mounts, network, hostname, I P C, and user if it's configured, and create a cgroup with whatever limits you asked for. Fourth, networking. It makes a virtual Ethernet pair, basically a virtual cable with two ends. One end goes inside the new network namespace, the other plugs into a virtual switch, a bridge, on the host. And fifth, switch the root to the merged overlay, drop privileges it doesn't need, and start the image's command. That process is the container.

B: And Docker does all of that itself?

A: Docker is actually several programs. The docker command you type is just a client. It talks to docker D, the daemon. That asks container D to manage containers. And container D runs a small program called run C, which actually does steps two through five, and then exits, and leaves your process running. You're going to do steps two, three and five yourself, by hand.

<!-- section: The Idea: Layer caching -->

A: Now the build side. Because this is where layers stop being trivia and start saving you real time. A Dockerfile is a list of steps, and each step that changes files makes one layer. When you rebuild, Docker reuses a cached layer for a step if three things hold. The step's instruction is the same. Its inputs are the same, and for a copy step, that means the hashes of the files being copied. And, this is the one people miss, the layer below it is the same. The moment one step misses the cache, every step after it has to rerun. Because each layer is "changes on top of exactly that parent". Different parent, different layer.

A: So try this. Your Dockerfile starts from python three twelve slim, sets the working directory, copies your whole project in, then runs pip install on your requirements file, then sets the command. Installing your packages takes about ninety seconds. You change one line in serve dot py and rebuild. What reruns, and how long does it take?

B: Just the copy, right? The requirements didn't change. So, like, a second.

A: [gently] That's the trap. The copy step copies serve dot py, so its input hash changed, and it misses the cache. Fine. But pip install sits on top of it. Its parent changed. So it reruns too, even though the requirements file didn't change at all. You pay the full ninety seconds for a one-line edit.

B: [sighs] Ugh. So you reorder it.

A: You reorder it. Copy only the requirements file first. Run pip install. Then copy the rest of the code. Now a code edit only changes the last layer, and the rebuild takes about a second. The rule is, things that change rarely go at the top, things that change often go at the bottom.

A: And if you played with it as a little simulator, you'd pick the order, naive or dependencies first, and then pick what you changed. Edit serve dot py, add a package, or bump the base image. Naive order plus a code edit, the pip step lights up as rerunning, labelled "parent changed", and the rebuild's about a minute and a half. Flip to dependencies first, same edit, and only the last copy reruns, well under a second. Now pick "add a package". Pip reruns in either order, and that's correct. It's the one case where it should. And "bump the base image" changes the very first layer, so everything below it reruns, every time, whatever order you used. Those times are just illustrative, but the shape is the point.

<!-- section: The Idea: Why containers start fast -->

A: And now you can predict the startup gap instead of memorising it. Starting a container is, make a few namespaces, which is just kernel bookkeeping. Make a cgroup directory and write a few files. Mount an overlay, which copies nothing, it just tells the kernel which directories to stack. And start a program. That's a process start with some extra labels. The image files are already on disk. Nothing gets booted, because the kernel's already running, and it has been for weeks. So it costs milliseconds. Most of what you feel when you type docker run is Docker's own machinery, talking to the daemon, setting up the network. Not the kernel.

A: [deliberate, listing] Starting a VM is a different story. Allocate and map its RAM. Start the virtual CPUs. Run firmware. Run a bootloader. Decompress and start a kernel. That kernel probes and initialises all its virtual devices. It mounts a root filesystem. It starts an init system, which starts services, which finally start your app. Every one of those is real work, and the guest has no idea it could skip any of them. A general-purpose Linux VM takes seconds to boot to a login prompt, and often ten or more with a full Ubuntu and cloud-init, the thing that configures a fresh cloud machine on first boot.

B: Is there anything in between? Like, VM safety without the boot?

A: There is, and it's worth knowing because it's what serverless and sandboxing platforms actually use. A micro VM. It's a deliberately minimal VM. Tiny virtual hardware, no USB, no graphics, just a few simple virtual devices. A stripped-down kernel. No firmware. It keeps VM-level isolation, but it boots in around a hundred milliseconds. AWS built one called Firecracker for Lambda. Their paper reports booting to user space in about a hundred twenty-five milliseconds, with a few megabytes of memory overhead per VM. And it gets there by deleting nearly everything a normal VM pretends to have.

<!-- section: The Idea: Docker on a Mac -->

A: So, the Mac puzzle. Why did a container on your Mac print a Linux kernel version? Containers are Linux processes, using Linux kernel features, namespaces, cgroups, overlay, and making Linux system calls. macOS's kernel is called X N U. It has none of those features, and it doesn't speak Linux system calls. So there's just no way to run a Linux container directly on macOS.

A: So Docker Desktop, and OrbStack, and Colima, and Podman's "machine" mode, they all do the same thing. They quietly boot one small Linux VM, using Apple's Virtualization framework, which is macOS's built-in way to run VMs on Apple silicon. They run the real Docker daemon inside that VM. And the docker command on your Mac just talks to it over a socket. So every container you've ever "run on your Mac" is a process inside that VM, sharing that VM's Linux kernel. That's the Linux version you saw.

B: [laughs] So I've been running a VM the whole time and didn't know.

A: The whole time. That's the fourth version of the picture. Apple silicon at the bottom, then macOS's kernel, then the Virtualization framework, then a Linux VM with its virtual hardware, then the Linux kernel, the one everything really shares, and then your containers on top, fenced, same as on the Spark. With the docker command sitting off to the side, down on the macOS level, as just a client. Count the kernels there and you get two.

A: And it explains some things you might've felt. It's why bind-mounting a big folder from your Mac into a container is slow. Every file access has to cross from the Linux VM over to macOS through a shared-filesystem layer. The VM also holds onto memory, and network traffic takes an extra hop through it. And Apple's own container tool, announced in twenty twenty-five, goes one step further and gives each container its own tiny VM, much like a micro VM.

A: And one more thing falls out. Your Mac and the Spark are both ARM sixty-four, so both run arm sixty-four images natively. Pull an image that only exists for A M D sixty-four, meaning Intel or AMD chips, and it either fails straight away with "exec format error", or it runs under instruction-by-instruction emulation and it's many times slower. A container shares the host's CPU just like it shares the kernel. Nothing translates the instructions for it. On Linux, like the Spark, there's no VM in the picture at all. Containers are just native processes.

<!-- section: The Idea: The security boundary -->

A: [serious] Now the scary part. The thing a container shares, the kernel, is the same thing that enforces the fence. So the security question is, how big is the surface that an attacker inside can poke at?

A: For a container, it's the whole Linux system call interface. A few hundred calls, with decades of complicated code behind them. Filesystems, networking, I O control calls straight into drivers. A bug anywhere in there that's reachable from inside can be a way out. And there are real examples. The Dirty COW kernel bug, in twenty sixteen. And a twenty nineteen bug where a malicious container could overwrite the host's run C program. The one that starts every container.

B: That one's nasty.

A: Yeah. So Docker shrinks the surface by default. It drops most of root's capabilities. Linux splits root's powers into about forty separate pieces, mount filesystems, load kernel modules, change the clock, ignore file permissions, and a process can hold some and not others. So root in a container is a weaker root. It applies a sec comp filter, which is a kernel feature that filters which system calls a process is allowed to make, and Docker's default blocks a few dozen risky ones. And optionally, it can run the container in a user namespace, so that root inside is nobody at all outside.

A: For a VM, the attacker inside owns a whole kernel. But that kernel can only talk to virtual hardware. So the surface is the hypervisor and its fake devices, which is much smaller and much more carefully guarded. VM escapes do happen. There was one called VENOM in twenty fifteen, and it was a bug in Q E M U's virtual floppy disk controller.

B: [amused] A floppy controller. In twenty fifteen.

A: [laughs] Emulated hardware nobody had used in years, still sitting there, reachable. But escapes like that are rarer, and worth a lot more to an attacker.

A: So the rule of thumb is, containers are a great fence between your own services. For running untrusted code, customer code, code an agent wrote, an RL environment executing whatever a model spat out, people reach for a stronger boundary. Either a micro VM, like Firecracker or Kata Containers. Or something called G visor, which is a kernel written to run in user space. It answers the container's system calls itself, so only a small, hardened subset ever reaches the real kernel.

B: Okay, so make it concrete. Say I need a thousand sandboxes running at once, each one executing code an agent wrote. What do I use?

A: Think about three things. Density, startup, and trust. Full VMs, each one needs a guest kernel and OS, so a few hundred megabytes of RAM at minimum. A thousand of them is hundreds of gigabytes. And seconds to boot each one. Too heavy. Plain containers, the overhead's close to just the processes themselves, a few megabytes beyond whatever the code uses. Shared image layers on disk and in the page cache. Startup in tens to hundreds of milliseconds. A thousand fits easily on one big box.

B: So containers.

A: [jumping in] Except the code's untrusted. And all thousand share the host kernel's full system call surface. One kernel bug, and it's an escape into your infrastructure. So the usual answer is the middle. Micro VMs, Firecracker or Kata, at roughly a hundred milliseconds to boot and a few megabytes of overhead each. Or G visor, to shrink that surface. And either way, cgroup limits on CPU, memory and number of processes, so one sandbox can't starve the rest. And then the things that actually limit how far it scales are memory per sandbox, the host's limits on processes and open files, and how fast you can create and destroy them.

<!-- section: The Idea: Containers and GPUs -->

A: Last piece of the idea, and it's the one that matters most on the Spark. GPUs. A GPU is driven by a kernel driver, the NVIDIA kernel module. Plus a user-space library that talks to that driver, lib CUDA, which is called the driver API. And on top of those sits the CUDA runtime, C U D N N, N C C L, and then PyTorch.

B: So the image has the NVIDIA driver baked into it, and that's why the PyTorch images are so huge?

A: [gently] They are huge, but not for that reason. A container shares the host kernel, so it shares the host's GPU driver. It can't bring its own. A kernel module lives in the kernel, and there's only one kernel. So NVIDIA has an add-on called the NVIDIA Container Toolkit that handles the hand-off. When you say docker run with "G P U s all", right before the container starts, the toolkit mounts the GPU's device files, and the host's matching lib CUDA, and the nvidia S M I tool, into the container. Everything above that, the CUDA runtime, C U D N N, PyTorch, comes from the image.

A: So picture the stack. At the very bottom, the GPU, the Blackwell on the Spark. Above it, the host kernel with the NVIDIA driver in it. Above that, a big dashed box, the container. Inside it, from the top, your training script, then PyTorch built for ARM sixty-four and Blackwell, then the CUDA runtime and friends. Those three come from the image. And at the bottom of the container box, shaded differently, lib CUDA and the device files, marked "mounted in from the host". Off to the left, outside the box, the toolkit and the host's driver libraries, with an arrow into that bottom slot. And from the container straight down to the driver, system calls. The reason the driver and lib CUDA come from the host together is that they have to match each other.

A: And this is why the Spark leans on containers so hard. The Spark's an unusual machine. An ARM sixty-four CPU, plus a Blackwell GPU. For a while, the generic pip install torch wheels often didn't include ARM builds with code compiled for the newest GPU architectures. And building PyTorch from source for that combination is a long, fiddly job. NVIDIA has a catalog called N G C, NVIDIA GPU Cloud. It's their registry of prebuilt, tested containers, PyTorch, Tensor R T L L M, V L L M, Triton, and more, rebuilt every month against matching CUDA, C U D N N and N C C L versions. And their PyTorch container ships PyTorch already built and tested for exactly this hardware. So on the Spark, running NVIDIA's PyTorch container with G P U s all is the main supported way to get working GPU PyTorch, and NVIDIA's Spark docs and playbooks use it all the way through. The plain pip wheel situation changes over time, though, so check NVIDIA's Spark docs for what they recommend now.

A: And the one rule to remember. The image's CUDA version has to be one the host driver supports. Newer drivers run older CUDA images just fine. But an image built against a CUDA that's newer than your driver fails, with an error about the driver being too old.

B: And I'd fix that by... grabbing an older image?

A: [firmly] You could. But the real fix is on the host. Update the driver. Not in the container, because the driver isn't the container's. It's the host's.

B: [working it out] Right, because it was never in the image to begin with.

<!-- section: Build It: A root filesystem and chroot -->

A: [upbeat] Okay. Now you build one. By hand. This is all on the Spark, because you need Linux and sudo, and the Mac can't do the namespace parts. Everything you make gets cleaned up by removing a directory, unmounting, or just exiting a shell, and nothing touches the Spark's real config. And a few of these commands come from the docs and man pages rather than a run on a Spark, so if a flag behaves differently, the man page for unshare wins.

A: First, you need a directory that contains a whole Linux userland and nothing else. Alpine's ideal. About eight megabytes unpacked. If Docker works on the Spark, the neat trick is to ask Docker to create an Alpine container but never start it. Then export that stopped container's filesystem as a tar stream and unpack it into a folder called root F S. Then delete the container. Or, without Docker, you download Alpine's "mini root filesystem" tarball for A arch sixty-four, which is ARM, and unpack that.

A: And then you just look at it. List it, and it's a whole slash. Bin, dev, etc, home, lib, all of it. The O S release file says Alpine. It's tiny. Ask what kind of file busybox is, that's the one program that provides most of Alpine's commands, and it says an ARM A arch sixty-four executable. And look for a boot folder, where a kernel would live. There isn't one. No kernel anywhere.

A: So here's a prediction. You use change root to step into that folder and start a shell. Inside, you mount proc, which is the special folder the kernel fills in live with the list of processes. Then you run P S. What processes do you see? And what's your shell's P I D?

B: [a bit unsure] I'm in Alpine's world now, so... just my shell? And it's P I D one?

A: [amused] That's what almost everyone guesses. You see every process on the Spark. System D as P I D one, your SSH session, Docker, all of it. And your shell has some big ordinary number. Change root only changed which directory you see as slash. It didn't create any namespace. And proc gets filled in live from the kernel's one process table, so it shows the host's processes. You're also still sharing the host's network, its hostname, its users. A change root is a different set of furniture in the same open-plan office.

B: Huh. So change root is the files part only. Not the fence.

A: Just the files. So the first task is to check that. Go in, poke around, mount proc, run P S, check the hostname and the network. And from a second terminal on the host, find your change-root shell in the host's process list and note its number. Then exit and unmount proc. And one warning. Don't try to set the hostname from inside. There's no hostname namespace yet, so you'd rename the actual Spark.

<!-- section: Build It: Namespaces -->

A: Next, you write a little script called box dot sh. It starts a shell from your root F S inside new namespaces. Process numbers, mounts, hostname, I P C and network. The tool is unshare. It creates namespaces and runs a command in them, and you give it a flag for each kind you want, plus one called fork, which we'll come back to because you're going to break it on purpose. Inside the new namespaces you change root into the folder and run a little setup. Mount proc, set the hostname to box one, and then replace the setup script with an interactive shell, so the shell takes over its place.

A: And the part that matters is the order. The mount of proc has to happen inside the new mount and process namespaces. If it happens outside, you're back to seeing the host's processes.

A: Then, inside your box, run P S. Your shell is P I D one. The hostname says box one. The network shows only loopback, and it's switched off. An empty network namespace. Leave a long sleep running in the background. Then go to a second terminal on the host. The hostname there is unchanged, still the Spark's. Search the host's process list for that sleep and there it is, same process, big host number. Look at its namespace links under proc, and compare them to your own terminal's. Process, mount, network and hostname all differ. User matches, because you didn't make a user namespace. And then run N S enter, targeting the sleep's host P I D, and tell it to join all its namespaces.

B: And that's...

A: That's docker exec. You've just written it. One small catch, N S enter joins the namespaces but can keep the host's root directory. So if you list slash and see the Spark's files, there's a flag to pick up the target's root too. The man page has it.

<!-- section: Build It: cgroups -->

A: Next you put the box in a cgroup. Call it my box. Sixty-four megabytes of memory, no swap, and half a core. First you check you're on cgroup version two. There's a quick check that asks what type of filesystem slash sys slash F S slash cgroup is, and you want it to say cgroup two F S. Then you check which controllers exist, and which ones child groups are allowed to use. You want CPU and memory in that second list, and if they're missing, you write "plus C P U, plus memory" into the subtree control file to switch them on.

A: Then the pieces, in your own order. Make the my box directory. Write sixty-four M into memory dot max, zero into memory dot swap dot max, and "fifty thousand, a hundred thousand" into C P U dot max. And the subtle one. Write the script's own P I D into my box's C group dot procs file, before the line that starts unshare. Because everything it starts after that inherits the group.

B: So the script puts itself in the group, and then the box is born inside it.

A: Right. Then you test both limits from inside. For CPU, you run "yes" into nowhere in the background. It's a command that just prints the letter Y forever, so it's one pure busy loop. Watch it in H top on the host. For memory, you take two hundred megabytes of zeros and pipe them into tail. Tail has to hold its whole "last line" in memory before it can print it, and a stream of zero bytes has no newlines. So tail tries to hold all two hundred megabytes. If busybox's tail is smarter than that, you just stuff the bytes into a shell variable instead.

A: Then on the host, read what happened. C P U dot stat has a counter, N R throttled, that keeps climbing. That's the quota biting. Memory dot events says O O M kill, one, after the tail. And memory dot peak shows the highest usage it ever reached, on newer kernels. When you're done and nothing's left inside the group, you remove the directory and it's gone.

<!-- section: Build It: The same knobs in Docker -->

A: Then you prove Docker is doing exactly what you did. Start an Alpine container in the background with a sixty-four megabyte memory limit and half a CPU, just sleeping. Ask Docker for its host P I D. Look up which cgroup it's in. Go read that cgroup's memory dot max, and it says sixty-seven million, one hundred eight thousand, eight hundred sixty-four. Which is just sixty-four times one thousand and twenty-four times one thousand and twenty-four. Sixty-four megabytes, in bytes. Read its C P U dot max, and it's fifty thousand, a hundred thousand. Your numbers, exactly. Look at its namespace links. Then docker exec P S inside it, and the sleep is P I D one.

B: So Docker's literally writing into the same files I did.

A: The same files. And if anything in that output doesn't make sense, like how the cgroup path is named, or why P S run through docker exec shows P S itself in the list, have an agent explain it. Just don't have it write the code.

<!-- section: Build It: Take an image apart -->

A: Then you take an image apart. Pull python three twelve slim. Ask Docker for its history, which gives one row per build step, with sizes. Then save the image to a tar file, and unpack it. Recent Docker versions write the O C I layout, an index file and a folder of blobs, each one named by its S H A two fifty-six hash, plus a Docker-style manifest. Older ones write one folder per layer. Find out which you got.

A: Then you go detective. Pretty-print the manifest, or follow the index, to find the config blob and the ordered list of layer blobs. Read the config and find the default command, the environment, the architecture, and the list of layer IDs. Ask what type each blob is, to tell JSON from tar from gzip, and look at the sizes. List what's inside one layer and find the one that contains Python three twelve. Then search every layer for whiteouts, those dot W H dot files. Are there any? Which step deleted what? And last, compute the S H A two fifty-six of a blob yourself and check it equals the blob's filename. That's content addressing. The name is the content.

A: And there's a bonus, to see overlay without Docker at all. Make four folders, lower, upper, work and merged. Put two files in lower. One says "base", one says "doomed". Mount an overlay with those. Then through the merged folder, change the first file and delete the second. Now look in upper. The first file's been copied up there, with your change. And the doomed file shows up as a weird special device file with the numbers zero, zero. That's what a whiteout looks like on disk. And the original in lower still says "base". Untouched.

<!-- section: Build It: A Dockerfile that rebuilds in a second -->

A: Then a real Dockerfile. Containerise a small FastAPI server that loads a tiny model and scores query and document pairs. A stand-in for your cross-encoder. NumPy dot products on random vectors are fine. For requirements, FastAPI, uvicorn, NumPy, plus something heavier so the install takes a while, scikit-learn or pandas. Write it the naive way first, copying everything before pip install. Build once. Change one line of serve dot py. Time the rebuild, and see which steps say "cached". Then reorder it, dependencies first, and measure again.

A: Then add a docker ignore file. At least the git folder, the Python cache folders, your virtual environment, and any data or checkpoint files. And it's worth working out why a stray two gigabyte checkpoint in that folder would hurt even with good ordering.

B: [working it out] Because copying the whole folder hashes everything in it? So the checkpoint's part of the copy step's input.

A: That's half. Any change to it busts the cache on that copy step. And the other half is that every single build has to ship the whole folder to the builder first, it's called the build context, so you're sending two gigabytes every time even when nothing changed. Then add a Build Kit cache mount for pip's download cache, so that even when the requirements really do change, pip reuses what it already downloaded. Check the current Dockerfile reference for the exact syntax. Then run it as a non-root user, and make docker stop fast. That's a Break It thing, coming up. And then have an agent review the Dockerfile for cache-busting mistakes, image size, and how P I D one handles signals.

<!-- section: Build It: GPU container and VM boot -->

A: Then the GPU. Check the NVIDIA toolkit is installed, then run NVIDIA's PyTorch container with G P U s all, and have it print the machine architecture, the torch version, whether CUDA is available, and the GPU's name. The tags look like a year and a month, so twenty-five dot something, one per month, and you pick one from the N G C catalog page or NVIDIA's Spark docs. Then run it again, and this time list the NVIDIA device files, and the mounts that mention NVIDIA or lib CUDA, and run nvidia S M I inside. Compare the driver version inside and outside the container. They're the same. Because it's the same driver. And look at the image size. It's big. Tens of gigabytes. Because it carries CUDA, C U D N N, N C C L, and a full PyTorch build. Not a driver.

A: And there's an optional one, to feel the VM gap instead of reading about it. Multipass, which is Canonical's quick VM tool. Time how long it takes to launch a VM. The first launch includes downloading an image, so launch a second one for a cleaner number. Then inside, a tool called system D analyze tells you how long the guest's own boot took, split into kernel time and userspace time. Or you can do it the hard way with Q E M U and K V M directly and an Ubuntu ARM cloud image, but that's fiddly, firmware and a little seed file for cloud-init, so have an agent explain the flags. Delete the VM when you're done.

A: And you're done when your box script gives you a shell that's P I D one, with its own hostname and an empty network, running Alpine's userland on the Spark's kernel, throttled to half a core and killed past sixty-four megabytes. When you've found the same cgroup files Docker wrote, and joined a container's namespaces with N S enter. When you can point to python slim's config, its layers, and a whiteout, or say why there isn't one. When your Dockerfile rebuilds in about a second after a code edit, and you measured both. And when CUDA says it's available inside an N G C container on the Spark.

<!-- section: Measure -->

A: Now, timing. Guess these before you measure. How long does it take to run a do-nothing program in a fresh set of namespaces with unshare and change root? How long for docker run on Alpine running the same do-nothing? And a VM booting to a shell?

B: Okay. Hand-made box, it's just a process start, so... milliseconds? Docker, maybe a bit more. Call it tens of milliseconds. VM, seconds.

A: [amused] Two out of three. The hand-made box is a few milliseconds. A couple of process starts plus kernel bookkeeping. The most expensive part is making the network namespace. Drop that flag and it gets cheaper. Docker run is a few hundred milliseconds, sometimes more.

B: [surprised] Hundreds? For the same kernel calls?

A: The kernel part is the same few milliseconds as yours. Almost all the rest is Docker. The command talks to the daemon, which talks to container D, which runs run C. Plus the network setup, that virtual cable and the bridge. Plus logging, plus cleanup. And the VM is seconds. System D analyze in a fresh Ubuntu VM usually reports a few seconds of kernel plus several seconds of userspace. And the whole multipass launch takes much longer than that, because it's also creating a disk and running cloud-init. A Firecracker-style micro VM sits in between, around a hundred milliseconds.

A: So, roughly a thousand times between your hand-made box and a VM. And Docker's convenience costs about a hundred times your box.

A: To measure it properly, run each one in a loop so one-off costs don't dominate. There's a nice tool called hyperfine that does warm-up runs and statistics for you. Give it four commands. Your box with and without the network namespace, and docker run with and without networking. Or just time twenty runs and divide. Sudo adds a little to the hand-made ones, so run the whole thing from a root shell to take that out. And write down a guess before each measurement, on the Spark and, where it makes sense, on the Mac. Kernel version inside and out, P I D inside and out, CPU percent under the quota, the O O M kill count, the slim image's layers and sizes, both rebuild times, all the startup numbers, the VM, and the size of the NVIDIA image.

A: Here's what the numbers should tell you. The kernel version is identical inside and outside on the Spark. That one line is the whole episode. On the Mac it shows the Docker VM's Linux kernel, a version that has nothing to do with macOS. P I D one inside, some big number outside. Same process. The kernel just keeps two numbers for it.

A: Then the CPU one, which is sneakier than it looks. "Yes" sits at about fifty percent of one core in H top. And the throttled counter keeps climbing. What's happening is, every hundred milliseconds, the group uses its fifty milliseconds of CPU, and then it's paused until the next period starts.

B: But fifty percent on average is fine, right? It's getting exactly what I gave it.

A: [serious] On average, yes. And that's the trap. A request that arrives just after the quota runs out has to wait for the rest of the period. Up to about fifty milliseconds, doing nothing, with the CPU sitting idle. So a CPU-limited container can have ugly tail latency, the slowest few percent of requests, even when its average CPU looks totally fine. Think about that next time you set a CPU limit on a latency-sensitive server.

A: Then memory. The tail dies, and O O M kill says one. But the rest of the box survives. The kernel killed the biggest process in the group, not the whole box. And if you hadn't set swap to zero, the group might've started swapping to disk and crawled instead of dying. Which is usually worse.

A: Rebuilds. The naive one is dominated by pip install. Tens of seconds to minutes, depending on packages and network. The reordered one, about a second, and nearly all of that is Docker's own overhead and sending the build context. And if docker run is way slower than a few hundred milliseconds, check whether it's pulling the image, or whether a logging driver or network plugin is slow. If your network-namespace row is much slower than the others, that's namespace creation for networking, which has historically been the most expensive kind.

<!-- section: Break It -->

A: Now break things. Four ways. First, forget the fork flag. Run unshare with just a new process namespace, change root, start a shell. Type L S. It works. Type L S again.

B: And it... doesn't?

A: [amused] It fails. Something like "can't fork, out of memory". Which is a really misleading message. Here's why. Unshare itself can't move into the new process namespace, because a process's P I D never changes once it exists. So the namespace starts out empty, and the first child created inside it becomes its P I D one. Your shell isn't in it. Your first L S was that first child. So it became P I D one. And when it finished, P I D one of the namespace died, the kernel tore the namespace down, and every later attempt to start a process in it fails with that out-of-memory error. The fork flag makes unshare fork first, so the shell itself becomes P I D one.

B: So when P I D one dies, the whole namespace goes with it.

A: Which is exactly how a Docker container's lifetime is tied to its main process. Your app exits, the container's gone.

A: Second. P I D one ignores your signals. On the host, start a sleep as P I D one of a new process namespace, in the background. Find its host P I D and send it sig term, the polite "please shut down" signal. Nothing happens. Send sig kill and it dies. The kernel protects a namespace's P I D one from any signal it hasn't installed a handler for. Sig kill and sig stop sent from outside are the exceptions. Normal programs rely on the default action for sig term, which is "die". But P I D one gets no default actions.

B: [surprised] Oh. That's the ten seconds. When docker stop just hangs.

A: [emphatic] That's the ten seconds. Docker sends sig term. Your Python server is P I D one, and it had no handler. Docker waits ten seconds, gives up, and sends sig kill. So there's no graceful shutdown and requests get dropped. The fixes are, handle sig term in your app, which in Python is the signal module, and uvicorn and most servers already do it. Or run with docker run's init flag, which puts a tiny init program called tini at P I D one. It forwards signals to your app, and it cleans up dead child processes, the so-called zombies. Try it. Start an Alpine container sleeping, time docker stop, then do it again with the init flag.

A: Third, wrong architecture. On the Spark, ask Docker to run Alpine for the A M D sixty-four platform and print the machine type. You'll get one of two things. "Exec format error", if no emulator's installed. Or it prints x eighty-six sixty-four, after a slow start, because Q E M U's emulation got registered with the kernel to run foreign binaries. Either way, same lesson. The container shares the host's CPU, so a binary for a different instruction set can't just run. Every image you use on the Spark or the Mac needs an arm sixty-four version, or you pay for emulation. And when you build images on your Mac to deploy on an x eighty-six cloud box, you've got the same problem in reverse. Docker's buildx, with the platform set to A M D sixty-four.

A: Fourth, bust the cache on purpose. In your good Dockerfile, near the top, add a build argument with the current time and a step that just echoes it. Build with the time passed in. Every build now reruns everything below that line. Then the subtler version. Split "apt get update" and "apt get install curl" into two separate steps. Build. A week later, add a package to the install line and rebuild.

B: The update step reruns because the package lists are a week old?

A: [jumping in] No, and that's the catch. The update step's text didn't change, its inputs didn't change, its parent didn't change. So it's cached. From a week ago. And now install runs against week-old package lists and may fail. The cache compares the instruction text and its inputs. Not the outside world. That's why you always see apt get update and apt get install glued together in one step.

<!-- section: Connections and close -->

A: If you want to go further, the Linux man pages on namespaces, written by Michael Kerrisk, are the real reference. And Liz Rice has a talk called "Containers From Scratch" where she builds one live in a few dozen lines of Go. And this connects forward. C I C D is mostly "build this Dockerfile, fast, on every commit", so the caching rules pay off right away. That CPU throttling is a tail latency source. And the thousand-sandboxes question is the real design problem behind RL environments and agent harnesses. Somewhere, model-written code has to run, and you now know what kind of box to put it in.

B: [relaxed, thinking out loud] Okay, let me try the whole thing. A VM fakes a whole computer and boots its own kernel on it. A container is a lightweight VM that shares the host's kernel instead, and Docker uses namespaces and cgroups to set it up. And the image is just the files.

A: [gently] Almost. Drop "lightweight VM". There's no VM in it at all, not even a small one. A container is just ordinary processes on the host's kernel. Namespaces change what they can see, cgroups cap what they can use, and the image's layers give them their files. That's it. Which is why it starts in milliseconds and why the image never has a kernel in it. And it's also why the fence is only as strong as that one shared kernel. On the Spark, that's the kernel version you saw, identical, inside and out.
