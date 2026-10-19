# Outline: containers

Source: src/lessons/containers.mdx. Curriculum: "Containers vs VMs."

## The one big idea

The line between a container and a virtual machine is the kernel. A VM fakes a whole computer and
boots its own kernel on it. A container is just ordinary processes on the host's one kernel, behind a
fence the kernel itself builds: what they can see, how much they can use, and which files they get.
Bring only the files, borrow the kernel. Almost every container fact follows from that.

## Opening scene

On the Spark, run an Ubuntu container and an Alpine container and ask each what it is. One says
Ubuntu, one says Alpine. Ask each, and the host, for the kernel version: all three print exactly the
same one, the Spark's. Two operating systems, one kernel. On the Mac, the same command prints a Linux
kernel version, though macOS isn't Linux.

## Wrong mental model B voices

His diagnostic answer, said by B nearly word for word: "A VM comes with an OS. A container doesn't...
it comes but it's not a GUI, I believe." A: half right in an interesting way, and the GUI has nothing
to do with it. Later B voices "so a container is a lightweight VM" and "a container is just as
isolated."

## Story beats

1. The scene: two distros, one kernel version. B's GUI answer. A: the line is lower, at the kernel.
2. An operating system is two things: the kernel (one program that owns the hardware) and userland
   (libraries, shell, commands, config). Distros differ mostly in userland. The two talk through
   system calls, and Linux keeps that doorway stable, which is the whole trick.
3. Two ways to give an app its own world: three fake buildings (VMs, each with a kernel) or three
   fenced apartments in one building (containers, one kernel). Corrected answer.
4. History: VMs first (IBM mainframes, Popek and Goldberg, x86 failing the test, VMware, hardware
   support). Containers from the other side: chroot, jails, then Linux pieces arriving one by one,
   Google engineers' cgroups so jobs wouldn't starve each other. Docker's five-minute talk added the
   missing piece: packaging. The kernel features were already there.
5. The three pieces of the fence. Namespaces: what you can see (your shell becomes process one; it
   has two numbers, one inside and one outside). Cgroups: what you can use (a ceiling, not a
   reservation, unlike a VM). Layered files: read-only layers shared by every container, a thin
   writable layer on top. An image is just a few archives plus a settings file. No kernel anywhere.
6. Layer caching in a sentence: change one step and everything after it reruns, so put the slow,
   rarely-changing install above the code.
7. What follows: containers start fast because nothing boots, the kernel's been running for weeks;
   VMs boot for real. Mac runs a hidden Linux VM because its kernel can't do any of this. Same CPU
   too: an Intel-only image won't run natively on the Spark.
8. The fence is enforced by the thing everyone shares. Security: container surface is the whole
   system-call interface; VM surface is the hypervisor. Fine between your own services; for
   model-written code, reach for a microVM.
9. GPUs: a container can't bring its own driver because the driver lives in the kernel; the toolkit
   mounts the host's in; the image brings CUDA and PyTorch. Image's CUDA must be one the host driver
   supports; fix the host, not the image. Why NVIDIA's containers are the way to get PyTorch on the
   Spark.
10. Build insight, brief: making a container by hand, the moment your shell is process number one and
    can't see anything else; and a Python server as process one ignoring the polite stop signal.
11. Ending: B restates; A sharpens "lightweight VM" into "fenced processes".

## Numbers worth saying (three)

- One kernel versus one per VM.
- Milliseconds versus seconds to start.
- Docker shown in a five-minute talk.

## Left to the written lesson

Exception levels, type one and two hypervisors, KVM, the namespace table, cgroup file names and
values, overlayfs details (copy-up, whiteouts), OCI manifest and config structure, the docker run step
list and the program chain under it, microVM boot numbers, Virtualization.framework, capabilities and
seccomp, CVE names, NGC tags, all Build tasks and commands, the Measure table, Break It details
(forgetting fork, wrong architecture, cache busting), Go Deeper.
