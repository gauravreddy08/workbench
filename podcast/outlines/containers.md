# Outline: containers

Source: src/lessons/containers.mdx. Curriculum entry: "Containers vs VMs." Question: what is a
container really, and how is it different from a virtual machine? Why: you ship everything in Docker;
it is just Linux features with good packaging. Diagnostic gap hit directly: "Containers vs VMs: fuzzy
(thought it was about GUIs)". B voices the GUI answer as their own.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereq: a process, PIDs, what the kernel keeps per process (processes lesson). -> A re-explains in one breath when PIDs first matter: a process is a running program the kernel tracks, with a number, its PID.
- T2 Mac can't do the namespace parts; Build is on the Spark with sudo. -> A, one sentence at start of Build.

## The Problem

- P1 Diagnostic answer: "A VM comes with an OS. A container doesn't... it comes but it's not a GUI, I believe." -> B says this as their own gut answer.
- P2 Half right in an interesting way: VM really does come with an OS; a container "sort of" does too: FROM ubuntu, and os-release inside says Ubuntu. So which is it? -> A grants it, poses the puzzle.
- P3 Scene: run an Ubuntu container and an Alpine container on the Spark, print distro and kernel version, then the host's kernel version: two distros, all three kernel versions identical, the Spark's own. -> A, as a scene; B reacts.
- P4 On the Mac the same docker run prints a Linux kernel version though macOS isn't Linux. -> A plants it as a puzzle, answered later.
- P5 GUIs irrelevant: almost no server VM runs a GUI; you can run GUI apps in containers. The line is at the kernel. -> A corrects B directly.
- P6 Things that fall out of one picture: small images, instant start, no Windows container on Linux, "container escape" is scary, Spark needs special containers for PyTorch. -> A, as a promise list said conversationally.

## Origin

- O1 VMs first: 1960s IBM CP-40 and CP-67, one mainframe pretending to be many, each user a private virtual System/360 with its own OS. -> A, story.
- O2 1974 Popek and Goldberg wrote down what a CPU must do to be virtualised efficiently. -> A.
- O3 x86 failed their test; VMware 1999 rewrote tricky guest instructions on the fly; then Intel VT-x 2005, AMD-V 2006 hardware support; Linux KVM 2007. -> A, quick timeline.
- O4 Containers from the other direction: not fake a machine, fence off processes on a real one. chroot 1979. -> A.
- O5 FreeBSD jails 2000, Solaris Zones 2004. -> A.
- O6 Linux: mount namespaces 2002; Google's Paul Menage and Rohit Seth "process containers", renamed cgroups, merged 2008 so Google could pack jobs without starving each other; LXC 2008. -> A.
- O7 2013 Solomon Hykes, five-minute PyCon talk showing Docker: the missing piece was packaging and shipping files. Kernel features were already there; Docker made them usable. -> A; B reacts to "five minutes".

## The Idea: an OS is two things

- I1 "Ubuntu" means two things stuck together. Kernel: one big program that owns the hardware; schedules processes, hands out memory, runs drivers, answers system calls. -> A, term defined inline.
- I2 Userland: everything else: C library, shell, ls and cp, Python, package manager, config in /etc. -> A.
- I3 Ubuntu, Debian, Alpine, Fedora run more or less the same Linux kernel; distros differ almost entirely in userland (which C library, package manager, versions, /etc). -> A; B connects to the scene.
- I4 System calls: the narrow doorway; fixed list of requests (open a file, read bytes, allocate memory, start a process, open a socket); Linux has a few hundred. Python opening a file eventually says "kernel, please do openat on this path" and the CPU jumps into kernel code. -> A.
- I5 Linux keeps the doorway stable: a program compiled against 2010's system calls still runs today. That promise is the whole trick: Alpine's shell doesn't care whose kernel answers, as long as it's Linux. -> A; B states it back.
- I6 Analogy: kernel = building (plumbing, electricity, landlord); userland = furniture and pantry; distro = a furniture set. Re-explain processes lesson's kitchen briefly. -> A, short, one point.

## The Idea: two ways to give an app its own world

- I7 VM = three fake buildings: pretend hardware, boots a whole OS with its own kernel and userland. Three VMs = four kernels (host plus three guests). -> A.
- I8 Container = fenced-off apartments in one building: processes on the host kernel with a fence; the OS that comes with it is only the userland half, the files. Three containers = one kernel. -> A.
- I9 Corrected diagnostic answer: VM = whole OS including own kernel on virtual hardware; container = only userland files of an OS, borrows host kernel. -> A says it plainly; B restates.
- F1 Figure 001 (interactive stack): VM column: hardware, host kernel, hypervisor, then per VM virtual hardware, guest kernel, userland, app. Container column: hardware, host kernel with namespaces/cgroups/overlayfs, then per container image files + app inside a dashed fence, plus a runtime box beside. Summary: 3 VMs = 4 kernels, 3 containers = 1. Mac mode: Apple silicon, XNU, Virtualization.framework, Linux VM, Linux kernel shared, containers; docker CLI on the side; 2 kernels. Notes: fence is labels, costs almost nothing; runtime steps aside, not between app and kernel; no init in containers, your app is PID 1. -> A describes like a diagram over the phone; count the kernels.

## The Idea: hypervisor

- I10 A kernel expects to be boss: write the CPU's page tables, catch interrupts, talk to the disk controller. A second kernel run as a normal program wouldn't be allowed. -> A; B asks how a guest kernel can run then.
- I11 Hypervisor: program that creates and runs VMs, decides what each guest gets, like a kernel for processes. CPU help: extra privilege level above the kernel. ARM exception levels: apps EL0, kernel EL1, hypervisor EL2. Guest kernel runs at EL1; touching something it doesn't own traps to EL2; hypervisor fakes the answer and resumes; guest never knows. -> A; levels said as "E L zero/one/two".
- I12 Type 1: on bare metal (Xen, VMware ESXi, Hyper-V); cloud VMs like EC2, GCP live on these. Type 2: app on a desktop OS (VirtualBox, VMware Fusion, Parallels, UTM). -> A.
- I13 KVM (Kernel-based Virtual Machine, since 2007): Linux itself becomes the hypervisor; QEMU (user-space) supplies fake devices; each VM is one QEMU process; ps shows it with as much memory as the guest was given. People argue type 1 or 2; the shape matters, not the label. -> A.
- I14 VM costs: RAM reserved up front (4 GB VM, host sets aside up to 4 GB); each guest kernel keeps its own caches and own copy of every library; starting = booting: firmware, bootloader, kernel, probing virtual devices, init system and services. Seconds at best, often tens of seconds. -> A.
- I15 VM buys: strongest common isolation boundary; any OS. Windows VM on Linux fine; Windows container on Linux impossible: Windows system calls, no Windows kernel to answer. -> A; B tests with "so no Windows container".

## The Idea: three kernel features

- I16 No "container" object in the kernel, no create-container system call. A container is a normal process started with three features turned on; Docker mostly turns them on consistently and ships the files. -> A; B voices "I thought a container was a thing".

### Namespaces

- I17 Namespace: gives a group of processes their own private copy of one kind of global thing; each kind separate, mix and match. -> A.
- I18 The seven kinds (table): pid (first process is PID 1, can't see/signal host processes); mnt (own mount table, own root); net (own interfaces, IPs, ports, routing table); uts (hostname); ipc (shared memory, message queues); user (root inside, UID 0, while ordinary user like 1000 outside); cgroup (see your own cgroup as root). -> A walks them as talk, not a table.
- I19 PID namespace: kernel keeps one real process table; a process in a new PID namespace has two numbers, real one and small one inside; inside view shows only its subtree. -> A.
- F2 Figure 002: host view: systemd PID 1, sshd 812, bash 4100, unshare 4120, sh 4121, sleep 4130. Inside: sh is PID 1, sleep PID 2, nothing else exists, no systemd, no sshd. Same process, two numbers. Other namespaces work the same: each a private copy of one global thing. -> A describes two side-by-side lists; uses a couple of the PIDs.
- I20 Namespaces visible as files: slash proc, the PID, slash ns: one link per namespace with an ID number; same number = same namespace. docker exec = start a new process and join it to an existing one's namespaces (setns system call, nsenter command). -> A; B: "so docker exec isn't going in over a network".
- I21 PID 1 is a special job: on a normal box it's systemd, adopts orphans, handles signals carefully; in a container PID 1 is usually your app, never written for that job. Bites people; broken later. -> A, plant.

### cgroups

- I22 Namespaces control what you see, not what you use; nothing stops using all 128 GB or every core. cgroup (control group): group of processes with enforced limits on CPU time, memory, I/O, number of processes, and counts usage. -> A.
- I23 cgroup v2 (DGX OS/Ubuntu): a filesystem under sys fs cgroup. Make a group = make a directory; set a limit = write a number into a file; add a process = write its PID into cgroup.procs; children inherit. -> A; B: "it's just files?"
- I24 memory.max: hard limit in bytes; over it, kernel reclaims, else OOM killer (out-of-memory killer: picks a process and kills it with SIGKILL) kills a process in the group. That's Kubernetes "OOMKilled" and docker run --memory 4g. -> A.
- I25 cpu.max: quota and period in microseconds; "fifty thousand, one hundred thousand" = at most 50 ms of CPU every 100 ms = half a core; docker run --cpus 0.5 writes exactly that. -> A.
- I26 memory.current, cpu.stat, memory.events: what was used, how often limit hit or OOM-killed. -> A, briefly.
- I27 VM with 4 GB has 4 GB reserved; container with memory.max 4 GB has a ceiling; uses 200 MB, costs 200 MB, rest free. -> B voices "so it reserves 4 GB" wrong model, A corrects.

### Layered filesystem

- I28 The files: chroot ("change root", 1979 system call): make a process see a chosen directory as root; only the filesystem view; root process can escape it. Modern runtimes use pivot_root inside a mount namespace; idea same: container's root is just a directory on the host. -> A.
- I29 Copying a 120 MB Python image per container would be slow and wasteful; so read-only layers (snapshot of one build step's file changes, a tarball) stacked by a union filesystem (stacks directories into one merged view; higher hides lower). On Linux: overlayfs, in kernel since 3.18, 2014. -> A.
- I30 Rules: image layers read-only lowers; each container gets one empty writable upper; reads find the topmost copy; writing a lower file copies it up whole first (copy-up), original untouched; deleting a lower file puts a whiteout marker in the upper (in tarballs, an empty file named dot w h dot name). -> A.
- F3 Figure 003: bottom to top: layer 1 debian base (bin/sh, old.log), layer 2 pip install (numpy), layer 3 COPY (serve.py), container layer (serve.py copy, whiteout for old.log), merged view (bin/sh, numpy, edited serve.py, old.log gone). -> A describes the stack top-down with the two events.
- I31 Hundred containers from the same image cost almost no extra disk: shared lowers, tiny uppers. Page cache (kernel's in-memory cache of recently read file contents) works across containers: libpython from a shared layer cached in RAM once. Hundred VMs: own disk images, own guest page caches, cached a hundred times. -> A; B asks about memory.

## So what is a Docker image?

- PR1 Predict: docker pull python:3.12-slim; what physical things is it? a kernel? how many pieces, how big? -> A asks; B guesses "a stripped-down Ubuntu, kernel included?"; reveal.
- PR1a Answer: a handful of tarballs and a couple of JSON files; no kernel, nothing boots. A few layer tarballs, one per file-changing build step; on the order of four or five (Debian base, packages, Python, final tweak); each a tar of files added/changed, usually gzipped, named by SHA-256 hash of contents. -> A.
- PR1b One config JSON: default command, environment variables, working directory, user, CPU architecture (arm64 or amd64), ordered list of layer hashes. One manifest JSON pointing at config and layers by hash; multi-architecture images: an index pointing at one manifest per architecture. -> A.
- PR1c Size around 40-50 MB compressed, a bit over 100 MB unpacked (approximate). Ubuntu cloud VM disk image: several hundred MB, and does contain a kernel, initramfs, bootloader. -> A.
- I32 OCI image spec (Open Container Initiative): same image runs under Docker, Podman, containerd, Kubernetes. Layers named by hash, so stored once however many images use them; second image FROM python:3.12-slim downloads only new layers. -> A.
- I33 docker run steps: 1 make sure layers on disk (pull, unpack); 2 mount overlay, layers as lowers plus fresh upper; 3 new namespaces (pid, mnt, net, uts, ipc, user if configured) and a cgroup with limits; 4 networking: virtual Ethernet pair, one end inside the net namespace, one on a host bridge; 5 switch root to merged overlay, drop privileges, exec the image's command; that process is the container. -> A narrates as a sequence.
- I34 Docker is several programs: docker CLI -> dockerd -> containerd -> runc; runc does steps 2-5 then exits, leaving your process. You'll do 2, 3, 5 by hand. -> A.

## Layer caching

- I35 Each file-changing step makes a layer. Cache reuse if instruction same, inputs same (for COPY, hashes of copied files), and the layer below is the same. One miss means every later step reruns, because each layer is changes on top of exactly that parent. Order of lines matters. -> A.
- PR2 Predict: FROM, WORKDIR, COPY . ., RUN pip install, CMD; install ~90 s; change one line in serve.py; which rerun, how long, reorder? -> A asks; B guesses "just the copy, a second"; A reveals: COPY misses, pip's parent changed, reruns: full ~90 s. Reorder: copy requirements.txt, pip install, then COPY . .; rebuild about a second. Rare-change at top, often-change at bottom. -> exchange.
- F4 Figure 004 (cache simulator): naive vs deps-first, three changes: edit serve.py, add a package, bump base image. Naive + edit: pip reruns with "parent changed", ~95 s illustrative. Deps-first + edit: only last COPY, under a second. Add a package: pip reruns in either order, correctly. Bump base: everything reruns, full price. Times illustrative. -> A as "flip between" description.

## Startup

- I36 Container start: a few namespaces (bookkeeping), a cgroup directory and a few files, mount an overlay (no copying), exec a program. Process start with labels. Files already on disk; kernel already running for weeks. Milliseconds; most of what you feel in docker run is Docker's machinery (daemon, network). -> A.
- I37 VM start: allocate and map RAM, virtual CPUs, firmware, bootloader, decompress and start kernel, probe devices, mount root, init system, services, app. Guest can't skip any. Seconds to a login prompt, often 10+ with full Ubuntu and cloud-init. -> A.
- I38 microVM: minimal VM, tiny virtual hardware (no USB, no graphics, a few virtio devices), stripped kernel, no firmware; VM isolation with ~100 ms boot. Firecracker for Lambda: paper reports ~125 ms to user space, a few MB overhead per VM; gets there by deleting nearly everything. -> A; B asks "is there a middle".

## Docker on the Mac

- I39 Containers are Linux processes with Linux kernel features and Linux system calls; macOS kernel XNU has none and doesn't speak Linux system calls; no direct Linux containers on macOS. -> A, answers the planted puzzle.
- I40 Docker Desktop, OrbStack, Colima, Podman machine: boot one small Linux VM with Apple's Virtualization.framework (macOS's built-in API for VMs on Apple silicon), run the real daemon inside, docker command on the Mac talks to it over a socket. Every container is a process in that VM sharing its kernel; that's why uname printed Linux. -> A; B: "so on my Mac I've been using a VM the whole time".
- I41 Bind-mounting a big Mac folder is slow: every file access crosses VM to macOS through a shared-filesystem layer. -> A.
- I42 Apple's own container tool (2025) gives each container its own tiny VM, like a microVM. -> A, one line.
- I43 Mac and Spark are ARM64, run arm64 images natively. amd64-only image: exec format error, or instruction-by-instruction emulation, many times slower. Container shares the host CPU like the kernel; nothing translates. -> A.

## Security boundary

- I44 The shared kernel is the thing enforcing the fence. Question: how big is the surface an attacker inside can poke? -> A.
- I45 Container surface: whole syscall interface, a few hundred calls, decades of code (filesystems, networking, ioctls into drivers). Bug reachable from inside can be a way out. Dirty COW (2016); CVE-2019-5736, malicious container could overwrite host runc binary. -> A.
- I46 Docker shrinks it: drops most root capabilities (root split into about 40 separately grantable powers: mount, load modules, change clock, bypass file permissions); seccomp filter (filters which syscalls are allowed; default blocks a few dozen risky ones); optionally user namespace so root inside is nobody outside. -> A.
- I47 VM surface: attacker owns a whole kernel but it only talks to virtual hardware; surface is hypervisor and fake devices; smaller, guarded. VM escapes happen: VENOM 2015, a bug in QEMU's virtual floppy controller; rarer and worth more. -> A; B reacts to the floppy.
- I48 Rule of thumb: containers great between your own services; untrusted code (customer code, agent-written code, RL environment running model code) -> microVM (Firecracker, Kata Containers) or gVisor, a user-space kernel that answers syscalls itself so only a small hardened subset reaches the real kernel. -> A.

## GPUs

- I49 GPU stack: kernel driver nvidia.ko; user-space library libcuda.so (driver API); above: CUDA runtime, cuDNN, NCCL, PyTorch. -> A.
- I50 Container shares host kernel so host's GPU driver; can't bring its own (one kernel, module lives there). NVIDIA Container Toolkit: on --gpus all, mounts device files (dev nvidia) and host's matching libcuda.so and nvidia-smi in; everything above from the image. -> A; B voices "so the image has the driver in it?" wrong model.
- F5 Figure 005: bottom GPU (GB10 Blackwell), host kernel plus nvidia driver, then inside the container box from top: your code, PyTorch built for ARM64 + Blackwell, CUDA runtime/cuDNN/NCCL (from the image), and at the bottom libcuda + device files mounted in from the host; toolkit beside, runs at container start; syscalls (ioctl) down to the driver. Driver and its library must match each other. -> A describes.
- I51 Why the Spark leans on containers: ARM64 CPU plus Blackwell GPU; for a while generic pip torch wheels often lacked ARM64 builds with kernels for newest GPUs; building from source is long and fiddly. NGC (NVIDIA GPU Cloud catalog, nvcr.io, rebuilt monthly against matching CUDA, cuDNN, NCCL): PyTorch built and tested for this hardware. docker run --gpus all on NVIDIA's PyTorch container is the main supported way; DGX Spark docs and playbooks use it. Pip wheel situation changes; check NVIDIA's Spark docs. -> A.
- I52 Rule: image's CUDA version must be one the host driver supports; newer drivers run older CUDA images; newer CUDA than driver fails with driver-too-old error; fix the host driver, not the container. -> A; B states it.

## Build It

- B0 On the Spark, sudo, workbench containers folder; everything cleaned up by rmdir, umount, exit; some commands verified from docs, man unshare wins. -> A, one sentence.
- B1 Task 0: minimal root filesystem: Alpine ~8 MB unpacked; docker create a stopped container (never started), docker export piped into tar into rootfs; or download Alpine mini root filesystem for aarch64. Look: a whole root directory, os-release says Alpine, small, busybox is an ARM aarch64 executable, no kernel anywhere (no boot folder). -> A.
- PR3 Predict: chroot into rootfs, mount proc, ps. What processes, what PID? Answer: every process on the Spark, systemd PID 1, SSH session, Docker; shell has a big ordinary PID. chroot only changed root; no new namespace; proc is filled live from the one process table. Shares network, hostname, users. "Different furniture in the same open-plan office." -> A asks, B guesses PID 1 (wrong), reveal.
- B2 Task 1: chroot alone; check prediction; from second terminal find shell in host ps; umount proc after. Don't run hostname-set inside: no UTS namespace, would rename the Spark. -> A.
- B3 Task 2: box.sh: unshare with pid, fork, mount, uts, ipc, net; inside, chroot into rootfs, mount proc, set hostname box1, exec a shell so it replaces setup script. Order: mount proc inside new mount and PID namespaces or shows host processes. -> A, what's built and the part that matters.
- B4 What you'd see inside: ps shows your shell as PID 1; hostname box1; ip addr shows only loopback, down: empty network namespace; leave a sleep running. From host: hostname unchanged; same sleep with a big host PID; its ns IDs: pid/mnt/net/uts differ, user matches; nsenter -a to join all its namespaces = you've written docker exec. If ls shows host root, add -r (nsenter root option). -> A.
- B5 Task 3: cgroup mybox: 64 MB memory, no swap, half a core. Check cgroup v2 (cgroup2fs), controllers, subtree_control has cpu and memory, else enable. mkdir; write 64M to memory.max, 0 to memory.swap.max, "50000 100000" to cpu.max; write the script's own PID into cgroup.procs before the exec unshare so everything inherits. -> A.
- B6 Test: yes into dev null busy loop, watch htop; head 200M of dev zero piped into tail (tail holds the whole last line, dev zero has no newlines); if busybox tail doesn't balloon, hold bytes in a shell variable. Host: cpu.stat nr_throttled climbing; memory.events oom_kill 1; memory.peak. Clean up rmdir once empty. -> A.
- B7 Task 4: real docker container with --memory 64m --cpus 0.5 sleeping; get its host PID from docker inspect; its cgroup path; memory.max reads 67108864; cpu.max "50000 100000"; ns links; docker exec ps shows sleep as PID 1; remove. Have an agent explain cgroup path naming or why exec ps shows ps too; don't have it write code. -> A; derive 64 x 1,048,576 said as "sixty-four times a mebibyte".
- B8 Task 5: take python:3.12-slim apart: docker history (one row per step with sizes); docker save to a tar; untar. Recent Docker: OCI layout (index.json, oci-layout, blobs sha256) plus manifest.json; older: dir per layer. Steps: find config and ordered layers via json tool; read Cmd, Env, architecture, rootfs diff_ids; file on blobs to tell JSON/tar/gzip, sizes; list a layer's contents, find python3.12 layer; grep for whiteouts across layers; sha256sum of a blob equals its filename = content addressing. -> A.
- B9 Bonus overlayfs by hand: lower/upper/work/merged dirs; lower has a.txt "base" and b.txt "doomed"; mount overlay; change a.txt and delete b.txt via merged; upper now has a.txt copied up and b.txt as a zero-zero character device = whiteout; lower a.txt still "base"; unmount. -> A.
- B10 Task 6: Dockerfile for small FastAPI ranker stand-in (NumPy dot products on random vectors); requirements fastapi, uvicorn, numpy, plus something heavy (scikit-learn or pandas). 1 naive build, edit, time rebuild, see CACHED; 2 reorder and repeat; 3 .dockerignore (.git, pycache, .venv, data/checkpoints): a stray 2 GB checkpoint busts the cache and slows every build even with good order; 4 BuildKit cache mount for pip's download cache so even a real requirements change reuses downloads; check syntax; 5 non-root user and fast docker stop. Agent reviews for cache-busting, size, PID 1 signals. -> A; B asks why the checkpoint busts cache.
- B11 Task 7: GPU container: nvidia-ctk version; run NVIDIA PyTorch container with --gpus all printing machine, torch version, cuda available, device name; tags like 25.xx-py3 monthly from NGC or Spark docs. List dev nvidia, mounts mentioning nvidia/libcuda, nvidia-smi inside. Driver version same inside and out: same driver. Image is big, tens of GB: CUDA, cuDNN, NCCL, full PyTorch. -> A.
- B12 Task 8 optional: time a VM boot: multipass (Canonical's quick-VM tool, a snap): time launch (first includes image download; launch a second for clean number); systemd-analyze inside splits kernel vs userspace. Or QEMU+KVM with Ubuntu arm64 cloud image (fiddly: UEFI firmware, cloud-init seed). Clean up with delete purge. -> A.
- B13 Done when: box.sh is PID 1, own hostname, empty network, Alpine userland on Spark kernel, throttled to half a core, killed past 64 MB; found Docker's same cgroup files; joined namespaces with nsenter; took slim image apart, found config, layers, whiteout or why none; Dockerfile rebuilds in about a second, measured; torch.cuda.is_available True in NGC on Spark. -> folded into Build talk, not a list.

## Measure

- PR4 Predict: unshare+chroot running true in fresh namespaces; docker run alpine true; VM to a shell. -> A asks, B guesses.
- M1 Raw namespaces + chroot: a few milliseconds; couple of process starts plus bookkeeping; network namespace most expensive part; drop --net, cheaper. -> A.
- M2 docker run alpine true: a few hundred ms, sometimes more: CLI to daemon to containerd to runc, veth and bridge, logging, cleanup; kernel part same few ms. -> A.
- M3 VM: seconds; systemd-analyze in fresh Ubuntu VM: a few s kernel plus several s userspace; multipass launch much longer overall (disk, cloud-init). microVM about 100 ms. -> A.
- M4 Roughly 1,000x between hand-made box and a VM; Docker's convenience about 100x your box. -> A.
- M5 Time with a loop (hyperfine, warmup 3, four variants: with/without net namespace, docker with/without network) or time 20 and divide; sudo adds a little, run under sudo -s. -> A, one line.
- M6 Fill-in table rows (uname, PIDs, CPU % of yes, oom_kill count, slim layers/compressed/unpacked, naive vs reordered rebuild, unshare ms with/without net, docker run ms, VM launch and systemd-analyze, NGC image size; Spark and Mac columns). -> A: "write down a guess for each, Spark and Mac" in a sentence; not read as a table.
- M7 uname identical inside and out on Spark: the whole lesson in one line. On the Mac shows the Docker VM's Linux kernel, unrelated to macOS. -> A.
- M8 PID 1 inside, big number outside; same process, kernel keeps two numbers. -> A.
- M9 yes sits ~50% of one core; nr_throttled climbs: each 100 ms period, uses its 50 ms, then paused. CPU-limited containers get ugly tail latency even when average CPU looks fine: request arriving just after the quota runs out waits up to the rest of the period. Think of it when setting --cpus on a latency-sensitive server. -> A; B: "but average CPU is fine" wrong model; A: worst case ~50 ms wait (derived from rest of period).
- M10 tail dies, oom_kill 1; rest of the box survives (kernel killed the biggest process in the group). If swap.max weren't 0, might swap and crawl instead of dying, usually worse. -> A.
- M11 Rebuild: naive dominated by pip, tens of s to minutes; reordered about a second, mostly Docker overhead and sending build context. -> A.
- M12 If docker run much slower than few hundred ms: pulling, slow logging driver or network plugin. --net row much slower: network namespace creation historically costliest. -> A.

## Break It

- K1 Forget --fork: unshare --pid chroot shell; first ls works, second fails "can't fork: Out of memory". unshare itself can't move into new PID namespace (PID never changes); first child becomes PID 1; that was the first ls; it exited, PID 1 died, namespace torn down, further forks fail with ENOMEM. --fork makes the shell PID 1. PID 1 dying = container dies: how Docker ties lifetime to main process. -> A sets up; B guesses; A explains.
- K2 PID 1 ignores signals: unshare pid fork mount-proc sleep; kill -TERM nothing; kill -KILL works. Kernel protects namespace's PID 1 from any signal without a handler (SIGKILL/SIGSTOP from outside excepted). Normal programs rely on default "die" for SIGTERM; PID 1 gets no defaults. docker stop on Python server hangs 10 s then kills: SIGTERM, no handler, gave up, SIGKILL; no graceful shutdown, dropped requests. Fixes: handle SIGTERM (Python signal module; uvicorn and most servers already do) or docker run --init, tiny init tini at PID 1 forwards signals and reaps zombies. Try time docker stop with and without --init. -> A; B: "that's the ten seconds".
- K3 Wrong architecture: --platform linux/amd64 alpine uname -m: exec format error (no emulator) or x86_64 after slow start (QEMU user-mode emulation via binfmt_misc). Container shares host CPU; every image on Spark/Mac needs arm64 or you pay for emulation; building on Mac for x86 cloud: same in reverse, buildx with platform amd64. -> A.
- K4 Bust cache on purpose: ARG BUILD_TIME and echo it near top, build with current time: everything below reruns each build. Subtler: split apt-get update and apt-get install into two RUNs; add a package a week later: update layer cached from a week ago, install may fail on stale lists. Cache compares instruction text and inputs, not outside world; hence update && install in one RUN. -> A; B voices "cache knows the package lists are old" wrong model.

## Explain It Back (substance must be in conversation)

- E1 Container vs VM, correcting GUI answer: not GUIs; VM = whole pretend computer, hypervisor fakes hardware, boots own kernel and OS; container = normal processes on host kernel, namespaces for private view, cgroups for caps; "comes with an OS" only as userland files; lighter, ms start, but shared kernel = weaker boundary, no different OS. -> covered by I1-I15 and the ending restatement.
- E2 docker run python:3.12-slim python serve.py walkthrough: CLI to daemon; layers on disk by hash; via containerd and runc: overlay, namespaces, cgroup with limits, veth to bridge, switch root, drop capabilities, apply seccomp, exec python serve.py as PID 1; runc exits; process talks to kernel directly. -> covered by I33/I34; A adds capabilities and seccomp in security section and ties back; "nothing in between" said explicitly.
- E3 Mac needs a VM; costs: memory reserved for VM, slower bind mounts, network extra hop, arm64 or emulation. On Linux no VM. -> I40-I43; A states memory and network-hop costs explicitly.
- E4 1,000 sandboxes running agent code: full VMs a few hundred MB minimum each (1,000 = hundreds of GB) and seconds each: too heavy. Containers: near process overhead, a few MB beyond code, shared layers and page cache, tens to hundreds of ms startup, 1,000 fits on one box, but untrusted code and full shared syscall surface: one kernel bug = escape. Middle: microVMs ~100 ms and few MB, or gVisor; plus cgroup limits on CPU, memory, number of processes. Scaling limits: memory per sandbox, host process and file-descriptor limits, create/destroy rate. -> A/B exchange in security section, B poses it as their real problem (agent sandbox).
- E5 GPU without own driver: host driver via kernel; toolkit mounts devices and libcuda; image brings runtime up; breaks: newer CUDA than driver (fix host), no arm64 build; hence NGC on Spark. -> I49-I52.

## Go Deeper / Connections

- G1 Best sources: Linux man pages on namespaces (Michael Kerrisk), and Liz Rice's "Containers From Scratch" talk. -> A, one sentence near the end.
- C1 Builds on processes lesson; CI/CD next is "build this Dockerfile fast every commit"; CPU-quota throttling shows up in tail latency; the sandbox question is the real design problem behind RL environments and agent harnesses. -> A, one or two sentences.

## Flow

1. Problem: B's GUI answer, A's puzzle scene (two distros, one kernel), Mac puzzle planted, GUI dismissed.
2. Origin as two stories (fake a machine vs fence off processes), ending on Docker's five minutes.
3. OS = kernel + userland, system calls doorway and stability promise.
4. Two ways; count the kernels; corrected answer; figure 001 over the phone (Mac mode deferred).
5. Hypervisor, exception levels, types, KVM, costs and what it buys (Windows container).
6. "No container object": namespaces (kinds, PID two numbers, figure 002, proc ns files, docker exec, PID 1 plant).
7. cgroups (files, memory.max/OOM, cpu.max, reserved vs ceiling).
8. Files: chroot, layers, overlayfs rules, figure 003, sharing disk and page cache.
9. Image predict, OCI, docker run steps, runc chain.
10. Layer caching predict and simulator.
11. Startup gap, microVM.
12. Mac VM payoff, bind mounts, Apple's tool, arm64.
13. Security boundary, capabilities, seccomp, VENOM, rule of thumb, sandbox-at-scale exchange (E4).
14. GPUs, toolkit, figure 005, NGC, CUDA/driver rule.
15. Build It tasks 0-8 with chroot predict.
16. Measure predict and expected numbers, throttling tail latency.
17. Break It four.
18. Close: sources, connections, B restates, A sharpens.
