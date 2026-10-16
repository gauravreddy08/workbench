# Coverage: containers

Lesson src/lessons/containers.mdx vs podcast/scripts/containers.md. Item IDs match
podcast/outlines/containers.md. All items covered; no MISSING remain.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 Process/PID recap | Three kernel features | "a P I D is just the number the kernel gives each running program" | covered |
| T2 Spark + sudo, Mac can't | Build It: root fs | "you need Linux and sudo, and the Mac can't do the namespace parts" | covered |
| P1 Diagnostic GUI answer | Problem | B: "it's not a GUI? I think that's the difference" | covered |
| P2 Half right; FROM ubuntu says Ubuntu | Problem | "you ask it what operating system this is, and it says Ubuntu" | covered |
| P3 Ubuntu/Alpine/host, same kernel version | Problem | "all three kernel versions are exactly the same" | covered |
| P4 Mac prints Linux kernel | Problem | "the container prints a Linux kernel version. On a Mac." | covered |
| P5 GUIs irrelevant; line at kernel | Problem | "Almost no server VM runs a GUI either" | covered |
| P6 Things that fall out of one picture | Problem | "Why images are small. Why containers start instantly..." | covered |
| O1 CP-40/CP-67, virtual System/360 | Origin | "C P forty and C P sixty-seven" | covered |
| O2 Popek and Goldberg 1974 | Origin | "in nineteen seventy-four, two researchers, Gerald Popek and Robert Goldberg" | covered |
| O3 x86 failed; VMware 1999; VT-x 2005, AMD-V 2006, KVM 2007 | Origin | "V T X, in two thousand five... K V M in two thousand seven" | covered |
| O4 Fence off processes; chroot 1979 | Origin | "fence off a group of processes on a real one... nineteen seventy-nine" | covered |
| O5 Jails 2000, Zones 2004 | Origin | "FreeBSD jails in two thousand, and Solaris Zones in two thousand four" | covered |
| O6 Mount ns 2002; Menage/Seth; cgroups 2008; LXC 2008 | Origin | "Paul Menage and Rohit Seth... merged into Linux in two thousand eight" | covered |
| O7 Hykes, 2013 PyCon, 5 minutes; packaging | Origin | "a five-minute talk at PyCon showing Docker" | covered |
| I1 Kernel definition | OS is two things | "one big program that runs with full control of the hardware" | covered |
| I2 Userland definition | OS is two things | "The C library, the shell, little commands like L S and C P" | covered |
| I3 Distros differ in userland | OS is two things | "What makes them different distributions is almost entirely their userland" | covered |
| I4 System calls, few hundred, openat | OS is two things | "kernel, please do open-at on this path" | covered |
| I5 Stable doorway, 2010 binaries | OS is two things | "compiled against Linux's system calls from twenty ten still runs" | covered |
| I6 Building/furniture analogy, kitchen recap | OS is two things | "The kernel is the building... a distro is just a particular furniture set" | covered |
| I7 VM = fake buildings; 4 kernels | Two ways | "three VMs on your machine means four kernels running" | covered |
| I8 Container = apartments; 1 kernel | Two ways | "So three containers means one kernel." | covered |
| I9 Corrected answer | Two ways | B: "A VM comes with a whole OS, kernel included... borrows the host's kernel" | covered |
| F1 Fig 001 stack, fence, runtime, no init, Mac mode | Two ways; Mac | "Count the kernels on that side. One."; "Count the kernels there and you get two." | covered |
| I10 Kernel wants to be boss | Hypervisor | "It wants to write the CPU's page tables" | covered |
| I11 Hypervisor; EL0/1/2; trap | Hypervisor | "Apps run at E L zero... The guest never knows" | covered |
| I12 Type 1 / Type 2 examples | Hypervisor | "Xen, VMware E S X i, Microsoft Hyper-V... U T M on a Mac" | covered |
| I13 KVM, QEMU process, label argument | Hypervisor | "each VM is just one Q E M U process" | covered |
| I14 VM costs: RAM reserved, caches, boot | Hypervisor | "Give a VM four gigabytes and the host sets aside up to four gigabytes" | covered |
| I15 VM buys isolation, any OS; no Windows container | Hypervisor | "A Windows program makes Windows system calls" | covered |
| I16 No container object | Three features | "There's no 'create container' system call." | covered |
| I17 Namespace definition | Three features | "gives a group of processes their own private copy of it" | covered |
| I18 Seven namespace kinds | Three features | "process numbers... mount... network... U T S... I P C... user... cgroup namespace" | covered |
| I19 One table, two numbers | Three features | "A process in a new P I D namespace just has two numbers" | covered |
| F2 Fig 002 host vs inside PIDs | Three features | "System D at P I D one... sleep, P I D two" | covered |
| I20 /proc/pid/ns, setns, nsenter, docker exec | Three features | "There's a system call for it, set N S, and a command, N S enter" | covered |
| I21 PID 1 special job | Three features | "Being P I D one is a special job, and it bites people" | covered |
| I22 cgroup definition | cgroups | "enforces limits on what that group uses" | covered |
| I23 cgroup v2 as files | cgroups | "Making a group is making a directory" | covered |
| I24 memory.max, OOM killer, OOMKilled, --memory | cgroups | "That's what 'container was O O M killed' means in Kubernetes" | covered |
| I25 cpu.max 50000 100000 = half core, --cpus 0.5 | cgroups | "at most fifty milliseconds of CPU time in every hundred milliseconds" | covered |
| I26 memory.current, cpu.stat, memory.events | cgroups | "Memory dot current, C P U dot stat, memory dot events" | covered |
| I27 Ceiling not reservation (B wrong model) | cgroups | "A limit, not a reservation." | covered |
| I28 chroot, pivot_root, root is a host dir | Layered filesystem | "a sturdier cousin called pivot root" | covered |
| I29 Layers, union fs, overlayfs 3.18/2014 | Layered filesystem | "built into the kernel since version three point eighteen, in twenty fourteen" | covered |
| I30 Lower/upper, copy-up, whiteout .wh. | Layered filesystem | "That's called copy-up... That marker's called a whiteout" | covered |
| F3 Fig 003 stack | Layered filesystem | "Bottom layer, a Debian base... the old log... just gone" | covered |
| I31 Shared disk, page cache once vs 100x | Layered filesystem | "cached in RAM once, not once per container" | covered |
| PR1 Image predict (B guess) | Docker image | B: "a stripped-down Debian, kernel and all" | covered |
| PR1a Layer tarballs, 4-5, gzip, SHA-256 names | Docker image | "on the order of four or five" | covered |
| PR1b Config and manifest, index | Docker image | "one config file... one manifest file... an index on top" | covered |
| PR1c 40-50 MB / ~100+ MB; VM image several hundred MB with kernel | Docker image | "Around forty to fifty megabytes compressed" | covered |
| I32 OCI spec, layers stored once | Docker image | "The O C I image spec, from the Open Container Initiative" | covered |
| I33 docker run five steps | Docker image | "First, make sure all the image's layers are on disk... fifth, switch the root" | covered |
| I34 CLI, dockerd, containerd, runc exits | Docker image | "runs a small program called run C, which actually does steps two through five, and then exits" | covered |
| I35 Cache rules, parent rule | Layer caching | "the layer below it is the same" | covered |
| PR2 Cache-order predict, 90 s, reorder, 1 s | Layer caching | "You pay the full ninety seconds for a one-line edit." | covered |
| F4 Fig 004 simulator, three changes | Layer caching | "Edit serve dot py, add a package, or bump the base image" | covered |
| I36 Container start = process + labels, ms | Startup | "That's a process start with some extra labels." | covered |
| I37 VM boot sequence, 10+ s | Startup | "often ten or more with a full Ubuntu and cloud-init" | covered |
| I38 microVM, Firecracker ~125 ms | Startup | "about a hundred twenty-five milliseconds" | covered |
| I39 XNU lacks features | Mac | "macOS's kernel is called X N U" | covered |
| I40 Docker Desktop etc boot Linux VM via Virtualization.framework | Mac | "OrbStack, and Colima, and Podman's 'machine' mode" | covered |
| I41 Bind mounts slow | Mac | "bind-mounting a big folder from your Mac into a container is slow" | covered |
| I42 Apple container tool 2025 | Mac | "Apple's own container tool, announced in twenty twenty-five" | covered |
| I43 ARM64, exec format error, emulation | Mac | "it either fails straight away with 'exec format error'" | covered |
| I44 Shared kernel enforces fence | Security | "the same thing that enforces the fence" | covered |
| I45 Syscall surface, Dirty COW, runc CVE | Security | "a twenty nineteen bug where a malicious container could overwrite the host's run C" | covered |
| I46 Capabilities ~40, seccomp, user ns | Security | "Linux splits root's powers into about forty separate pieces" | covered |
| I47 VM surface, VENOM floppy 2015 | Security | "a bug in Q E M U's virtual floppy disk controller" | covered |
| I48 Rule of thumb; Firecracker, Kata, gVisor | Security | "G visor... answers the container's system calls itself" | covered |
| I49 GPU stack | GPUs | "the NVIDIA kernel module. Plus a user-space library... lib CUDA" | covered |
| I50 Host driver; toolkit mounts (B wrong model) | GPUs | B: "the image has the NVIDIA driver baked into it" | covered |
| F5 Fig 005 | GPUs | "marked 'mounted in from the host'" | covered |
| I51 Spark ARM64+Blackwell, wheels, NGC monthly | GPUs | "rebuilt every month against matching CUDA" | covered |
| I52 CUDA vs driver rule, fix host | GPUs | "the real fix is on the host. Update the driver." | covered |
| B0 Safety/cleanup, man page wins | Build: root fs | "the man page for unshare wins" | covered |
| B1 Alpine rootfs, export, look, no kernel | Build: root fs | "About eight megabytes unpacked... No kernel anywhere." | covered |
| PR3 chroot ps predict | Build: root fs | "You see every process on the Spark." | covered |
| B2 Task 1, hostname warning | Build: root fs | "you'd rename the actual Spark" | covered |
| B3 box.sh, unshare flags, order | Build: namespaces | "The mount of proc has to happen inside the new mount and process namespaces" | covered |
| B4 Inside/outside observations, nsenter, -r caveat | Build: namespaces | "That's docker exec. You've just written it." | covered |
| B5 cgroup mybox setup | Build: cgroups | "Write the script's own P I D... before the line that starts unshare" | covered |
| B6 yes / tail tests, stat files, cleanup | Build: cgroups | "N R throttled, that keeps climbing" | covered |
| B7 Task 4 Docker knobs, 67108864 | Build: Docker knobs | "sixty-seven million, one hundred eight thousand, eight hundred sixty-four" | covered |
| B8 Task 5 image apart | Build: image apart | "That's content addressing. The name is the content." | covered |
| B9 Overlay bonus | Build: image apart | "a weird special device file with the numbers zero, zero" | covered |
| B10 Task 6 Dockerfile, dockerignore, cache mount | Build: Dockerfile | "a stray two gigabyte checkpoint" | covered |
| B11 Task 7 GPU container | Build: GPU | "Compare the driver version inside and outside... They're the same." | covered |
| B12 Task 8 VM boot | Build: GPU and VM | "Multipass, which is Canonical's quick VM tool" | covered |
| B13 Done when | Build: GPU and VM | "And you're done when your box script gives you a shell that's P I D one" | covered |
| PR4 Startup predict | Measure | B: "Call it tens of milliseconds." | covered |
| M1 Few ms, net ns costliest | Measure | "The most expensive part is making the network namespace." | covered |
| M2 docker run few hundred ms, why | Measure | "Docker run is a few hundred milliseconds" | covered |
| M3 VM seconds, multipass longer, microVM ~100 ms | Measure | "a few seconds of kernel plus several seconds of userspace" | covered |
| M4 ~1,000x and ~100x | Measure | "roughly a thousand times... about a hundred times your box" | covered |
| M5 hyperfine, loop of 20, sudo | Measure | "Or just time twenty runs and divide." | covered |
| M6 Fill-in table rows | Measure | "write down a guess before each measurement" | covered |
| M7 uname identical | Measure | "That one line is the whole episode." | covered |
| M8 PID 1 vs big number | Measure | "The kernel just keeps two numbers for it." | covered |
| M9 50%, throttling, tail latency | Measure | "a CPU-limited container can have ugly tail latency" | covered |
| M10 oom_kill 1, swap worse | Measure | "might've started swapping to disk and crawled" | covered |
| M11 Rebuild numbers | Measure | "Tens of seconds to minutes" | covered |
| M12 Slow docker / net row | Measure | "check whether it's pulling the image" | covered |
| K1 Forget --fork | Break It | "can't fork, out of memory" | covered |
| K2 PID 1 signals, docker stop 10 s, --init tini | Break It | "That's the ten seconds." | covered |
| K3 Wrong architecture, binfmt, buildx | Break It | "Docker's buildx, with the platform set to A M D sixty-four" | covered |
| K4 Bust cache, apt update stale | Break It | "Not the outside world." | covered |
| E1 Container vs VM | Two ways; close | "There's no VM in it at all, not even a small one." | covered |
| E2 docker run walkthrough, drops capabilities, seccomp, nothing in between | Docker image; Security; Fig 001 | "Nothing's sitting between them." | covered |
| E3 Mac VM costs | Mac | "The VM also holds onto memory, and network traffic takes an extra hop" | covered |
| E4 1,000 sandboxes | Security | B: "Say I need a thousand sandboxes running at once" | covered |
| E5 GPU without own driver | GPUs | covered via I49-I52 | covered |
| G1 Sources | Close | "Liz Rice has a talk called 'Containers From Scratch'" | covered |
| C1 Connections | Close | "the real design problem behind RL environments and agent harnesses" | covered |

Numbers checked against the lesson. Derived (not written in the lesson): "up to about fifty
milliseconds" worst-case wait under the half-core quota (rest of a hundred-millisecond period after a
fifty-millisecond quota); sixty-seven million and change explained as sixty-four times 1,024 times 1,024.
