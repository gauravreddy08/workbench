# Outline: c-for-python

## The one big idea

C is a thin, honest layer over memory: every value is a box of a known size at a numbered address.
Once you see that, the C under Python stops being scary. A Python variable is a pointer, a list is
a pointer to an array of pointers to scattered objects, a tensor is one flat block plus a rule for
finding things in it, and a GPU kernel is the same loop body with the loop handed to the hardware.
Reading it is how you stop taking speed claims on trust.

## Opening scene

llama.cpp runs a small model slower than expected on the Spark. A GitHub issue blames one function
for not being vectorized on ARM. He clicks through: stars in odd places, a line starting with a
hash, a loop with nothing before the first semicolon. He closes the tab and believes the issue.

## The wrong mental model B voices

No diagnostic quote for C directly. B voices two natural wrong models: "C is fast because it's
low-level, close to the metal" (vague magic), and "Python passes by reference, so a function that
doubles its argument changes my variable" (it doesn't: the name still points at the old object).

## Story beats

1. The GitHub issue and the closed tab. C isn't hard; it's unfamiliar in about ten specific ways,
   each mapping onto something he knows.
2. Origin: Thompson's B had no types, every value was one machine word. The PDP-11 addressed single
   bytes and would get floating-point hardware; Ritchie added types so the compiler knows how many
   bytes each value takes and which instruction to use. Unix rewritten in C. Every odd rule exists
   because the compiler must know sizes and places ahead of time.
3. Types are byte counts. Python ints grow forever because each one is a full object on the heap;
   a C int has a fixed size and breaks rather than grows.
4. Compiling: translate once versus an interpreter reading every instruction every time. The deeper
   reason it's fast is types: two known doubles become one add instruction; Python has to look up
   what things are right now, build a new float object, and adjust counts.
5. Boxes and addresses: the ampersand means "where it lives", the star means "is a pointer" in a
   declaration and "go there" in use. Functions get copies, so to let one change your variable you
   hand it the address: the output-through-a-pointer pattern.
6. B's pass-by-reference guess; A corrects it. The bridge: every Python variable is a C pointer to
   an object on the heap; id is literally that address.
7. A list versus a C array: pointers to scattered float objects versus the numbers side by side.
   NumPy and PyTorch store the second. No length, no bounds check: Python's IndexError is a check
   CPython runs for you, in C.
8. A tensor is a data pointer, an element type, a shape, and strides. Transposing moves no numbers,
   it makes a new lens; that's why flattening a transposed tensor complains until you copy it into
   a contiguous layout. A GPU kernel receives exactly a pointer and these numbers.
9. A Python list in C: a refcount, a type pointer, a length, a pointer to the array of pointers,
   and spare room so append is cheap. Indexing is two pointer hops. Refcounts answer "who frees
   this memory", which in C is your job.
10. A GPU kernel: no loop. Thousands of threads each run the same body with their own index; the
    body is word for word the plain loop from the llama.cpp function.
11. Back to the issue: the hash lines edit the file before compiling; on ARM the hand-written fast
    block is deleted. But the compiler vectorized the plain loop itself. The issue is right, sort
    of. Look or measure.
12. When I ran it: Python loop to optimized C is close to twenty times; the surprise was the
    optimizer deleting a repeated benchmark entirely. It promises the same output, not the same
    work.
13. Ending: B says "C is fast because it's close to the hardware"; A sharpens: it's fast because
    the compiler knows every size and place ahead of time, and the same knowledge is what lets you
    read it.

## Numbers worth saying

- Python loop to C, close to twenty times.
- Four floats at once (the ARM vector add), eight on Intel.
- A list grows by about an eighth.

## Left to the written lesson

The sizeof table and struct padding, every code sample and C syntax detail (for loop, printf
formats, arrow operator, macros list, noise words), the five-step reading recipe, borrowed versus
new references, PyList_GetItem, the list_resize formula, the CUDA launch arithmetic, all Build
tasks (sizes.c, pointers.c, sum.c, ctypes reading of the list struct), the sum ladder table and
fast-math, AddressSanitizer, int overflow numbers, returning a local's address, the scaling
question, Go Deeper.
