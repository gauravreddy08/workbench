// The whole map. Every lesson lives here; a lesson is "written" when
// src/lessons/<slug>.mdx exists, otherwise it renders as a stub page.
//
// To add a lesson: append an entry to the right track (keep slugs unique),
// then ask Claude to write src/lessons/<slug>.mdx following CLAUDE.md.

export type Lesson = {
  slug: string;
  title: string;
  question: string; // the one question this lesson answers, in plain words
  why: string; // why you should care, ideally tied to real work
  build: string; // the thing you build or measure
  source?: string; // where this gap came from (job post, interview, inbox)
};

export type Track = {
  id: string;
  n: number;
  title: string;
  blurb: string;
  lessons: Lesson[];
};

export const tracks: Track[] = [
  {
    id: 'machine',
    n: 1,
    title: 'The Machine',
    blurb: 'What your code turns into once it runs: memory, processes, threads, waiting.',
    lessons: [
      {
        slug: 'latency-numbers',
        title: 'How slow is slow?',
        question: 'How long does it actually take to read from RAM, an SSD, or the network?',
        why: 'Every "how does this scale?" answer starts with these numbers. Without them you are guessing.',
        build: 'A small benchmark that measures each rung of the latency ladder on your laptop and your DGX Spark.',
      },
      {
        slug: 'stack-and-heap',
        title: 'Where do my variables live?',
        question: 'What are the stack and the heap, and where does a Python object actually sit in memory?',
        why: 'Memory leaks, recursion limits, and "why is this list so big" all come back to this.',
        build: 'Poke at real addresses and object sizes from Python and C, then blow the stack on purpose.',
      },
      {
        slug: 'processes-threads-gil',
        title: 'Processes, threads and the GIL.',
        question: 'What is the difference between a process and a thread, and why does Python have a lock that ruins threads?',
        why: 'Picking threads vs processes wrong makes a data loader or server 8x slower, silently.',
        build: 'Run the same CPU job and the same network job with threads and with processes; explain every timing.',
      },
      {
        slug: 'waiting-vs-working',
        title: 'Waiting vs working.',
        question: 'What do sync and async actually mean, and why does my server stall under load?',
        why: 'Every LLM app spends most of its life waiting on a network. Async is how one process waits on thousands of things.',
        build: 'A server that calls a slow fake LLM. Hammer it, watch it stall, rebuild it async, hammer it again.',
      },
      {
        slug: 'cpu-caches',
        title: 'Why is NumPy 100x faster?',
        question: 'Why is looping over a NumPy array so much faster than a Python list of the same numbers?',
        why: 'Memory layout and caches decide speed long before the algorithm does. Same idea scales up to GPUs.',
        build: 'Sum the same numbers five ways (list, array, strided, random order, vectorized) and explain the gaps.',
      },
      {
        slug: 'virtual-memory',
        title: 'Virtual memory and the OOM killer.',
        question: 'What is virtual memory, and why did Linux kill my process when I had "free" memory?',
        why: 'Loading a 70B model, mmap, swap, and OOM kills on the Spark all live here.',
        build: 'Allocate memory you never touch, then touch it; watch RSS vs virtual size and trigger the OOM killer safely.',
      },
      {
        slug: 'files-and-disks',
        title: 'What happens when you save a file?',
        question: 'What actually happens between file.write() and the bytes being safe on disk?',
        why: 'Fast model loading (safetensors, mmap) and data that survives a crash both depend on it.',
        build: 'Load the same model weights with torch.load and with mmap\'d safetensors; time cold vs warm page cache.',
      },
      {
        slug: 'python-speed',
        title: 'Why is Python slow?',
        question: 'What does the Python interpreter actually do, and how does PyTorch get speed anyway?',
        why: 'Knowing where Python ends and C/CUDA begins tells you what is worth optimizing.',
        build: 'Disassemble bytecode, write the same loop as a C extension, then try torch.compile on a small model.',
      },
    ],
  },
  {
    id: 'wire',
    n: 2,
    title: 'The Wire',
    blurb: 'How bytes get from one machine to another, from IP packets to streaming tokens.',
    lessons: [
      {
        slug: 'packets-and-ip',
        title: 'How does data travel?',
        question: 'What is an IP address, a packet, and a route, and what happens between my laptop and a server?',
        why: 'The base layer under every API call, every SSH session, and every latency number you measure.',
        build: 'Trace the path to a few servers, capture your own packets, and read them byte by byte.',
      },
      {
        slug: 'tcp-vs-udp',
        title: 'TCP and UDP.',
        question: 'Why are there two transport protocols, and what is TCP doing for me that UDP is not?',
        why: 'Head-of-line blocking, handshakes, and timeouts show up in every distributed system.',
        build: 'Build a tiny reliable channel on top of UDP: sequence numbers, acks, retries. Then compare to TCP.',
      },
      {
        slug: 'what-happens-url',
        title: 'What happens when you hit enter?',
        question: 'Step by step, what happens between typing a URL and seeing the page?',
        why: 'A classic interview question and a map of the whole stack: DNS, TCP, TLS, HTTP, rendering.',
        build: 'Fetch a page by hand with raw sockets, timing each phase (DNS, connect, TLS, first byte).',
      },
      {
        slug: 'tls',
        title: 'How does HTTPS keep secrets?',
        question: 'How do two machines that have never met agree on a secret over a public network?',
        why: 'Certificates, keys, and handshakes are behind every "SSL error" you will ever debug.',
        build: 'Do a toy key exchange by hand, then inspect a real TLS handshake and certificate chain.',
      },
      {
        slug: 'http-from-scratch',
        title: 'HTTP from scratch.',
        question: 'What is HTTP really, under the frameworks?',
        why: 'FastAPI and friends are thin layers over a text protocol. Knowing it makes every API bug readable.',
        build: 'Write an HTTP/1.1 server on raw sockets that serves JSON, handles keep-alive, and survives curl.',
      },
      {
        slug: 'streaming',
        title: 'Polling, SSE and WebSockets.',
        question: 'How do servers push data to clients, and why do LLM APIs stream with SSE?',
        why: 'Token streaming, time-to-first-token, and dropped connections all depend on this choice.',
        build: 'Stream tokens from a fake model three ways and measure latency and overhead of each.',
      },
      {
        slug: 'ssh-and-tailscale',
        title: 'Your home server, explained.',
        question: 'What actually happens when I SSH into my home server over Tailscale?',
        why: 'You already use it. Knowing keys, NAT, and WireGuard turns magic into something you can fix.',
        build: 'Harden your SSH server (keys only, config, fail2ban), then map how Tailscale punches through your router.',
      },
      {
        slug: 'api-lifecycle',
        title: 'The life of an API.',
        question: 'What is an API lifecycle, from design to deprecation?',
        why: 'An interview question you missed, and a real job: versioning, idempotency, auth, rate limits, docs.',
        build: 'Design, version, and deprecate an endpoint of your inference server without breaking a client.',
        source: 'interview',
      },
    ],
  },
  {
    id: 'data',
    n: 3,
    title: 'Data',
    blurb: 'Storing things so they survive, stay correct, and come back fast.',
    lessons: [
      {
        slug: 'why-databases',
        title: 'Why not a JSON file?',
        question: 'What does a database give you that writing JSON to disk does not?',
        why: 'Durability, concurrency, and queries are problems you only notice once they break.',
        build: 'Build a tiny key-value store with an append-only log, crash it mid-write, and recover.',
      },
      {
        slug: 'indexes',
        title: 'Indexes and B-trees.',
        question: 'What is a database index, why does it make reads fast, and why does it make writes slower?',
        why: 'The single most common fix for a slow query, and the root of many slow writes.',
        build: 'Load a million rows into Postgres, read EXPLAIN plans with and without an index, then build a mini B-tree.',
      },
      {
        slug: 'transactions',
        title: 'Transactions.',
        question: 'What does a transaction guarantee, and what goes wrong without one?',
        why: 'Double charges, lost updates, and corrupted counters are all missing transactions.',
        build: 'Write a race condition that loses money, then fix it with transactions and isolation levels.',
      },
      {
        slug: 'normalization',
        title: 'Normalization.',
        question: 'Why do databases split data into many tables, and when should you not?',
        why: 'You hit this at work. Good schemas make bugs impossible instead of just unlikely.',
        build: 'Take a messy spreadsheet of runs and evals, find the update bugs it allows, and normalize it.',
        source: 'work',
      },
      {
        slug: 'caching',
        title: 'Caching and Redis.',
        question: 'When should you cache, how long should things live (TTL), and how do caches go wrong?',
        why: 'The cheapest speedup there is, and the source of the hardest bugs (stale data).',
        build: 'Put Redis in front of your inference server for repeated prompts; measure hit rate and staleness.',
      },
      {
        slug: 'vector-search',
        title: 'Nearest neighbors at scale.',
        question: 'How do you find the closest embedding among 100 million without checking them all?',
        why: 'The retrieval half of your ranking work. Recall vs speed is a dial you should be able to set.',
        build: 'Brute force vs IVF vs HNSW on a real embedding set; plot recall against latency.',
      },
      {
        slug: 'queues',
        title: 'Queues and logs.',
        question: 'What is a message queue, and why do big systems put one between every pair of services?',
        why: 'Batch jobs, retries, and smoothing traffic spikes all use queues.',
        build: 'Move slow work out of a request into a worker queue; kill workers and make sure nothing is lost.',
      },
    ],
  },
  {
    id: 'scale',
    n: 4,
    title: 'Scale',
    blurb: 'Answering "how does it scale?" with numbers instead of vibes.',
    lessons: [
      {
        slug: 'back-of-envelope',
        title: 'How does it scale?',
        question: 'How do you estimate whether a design will hold up before you build it?',
        why: 'The question that stumps you in interviews. It is arithmetic with the latency numbers, nothing more.',
        build: 'Estimate the hardware needed to serve your ranker at 1k, 100k, 10M queries a day; check one estimate for real.',
        source: 'interview',
      },
      {
        slug: 'tail-latency',
        title: 'p99 and load testing.',
        question: 'Why do people care about p99, and how do you measure it without lying to yourself?',
        why: 'Averages hide the users who are suffering. Most load tests measure it wrong.',
        build: 'Load-test your server, find the knee in the latency curve, and catch coordinated omission.',
      },
      {
        slug: 'load-balancing',
        title: 'Load balancers and state.',
        question: 'What happens when you run three copies of a server, and why does state break everything?',
        why: 'The first step from one machine to many. Stateless design is the whole trick.',
        build: 'Run three copies behind nginx, break sessions with in-memory state, then fix it.',
      },
      {
        slug: 'rate-limits',
        title: 'Rate limits and backpressure.',
        question: 'How does a system say "slow down" instead of falling over?',
        why: 'Every public API, including the ones you call, does this. So should yours.',
        build: 'Add a token-bucket limiter and a bounded queue to your server; flood it and watch it shed load gracefully.',
      },
      {
        slug: 'containers',
        title: 'Containers vs VMs.',
        question: 'What is a container really, and how is it different from a virtual machine?',
        why: 'You ship everything in Docker. It is just Linux features with good packaging.',
        build: 'Build a "container" by hand with namespaces and cgroups, then compare it to a Docker run.',
      },
      {
        slug: 'ci-cd',
        title: 'Why every team has a pipeline.',
        question: 'What problem do source control and CI/CD actually solve?',
        why: 'You know how to use them; this is why they exist and what a good pipeline protects you from.',
        build: 'Set up CI/CD for this very site: tests, build, deploy on push, and a rollback.',
      },
      {
        slug: 'observability',
        title: 'Logs, metrics and traces.',
        question: 'How do you know what a running system is doing, and why it got slow at 3am?',
        why: 'You cannot fix what you cannot see. Production debugging is mostly this.',
        build: 'Instrument your inference server with metrics and traces; find a slowdown you planted.',
      },
      {
        slug: 'design-docs',
        title: 'Writing a design doc.',
        question: 'How do engineers decide on a design before building it, in writing?',
        why: 'Listed in research engineer roles. Writing forces the thinking that code lets you skip.',
        build: 'Write a fault-tolerance design doc for a training job that must survive node failures.',
        source: 'Anthropic research engineer posting',
      },
    ],
  },
  {
    id: 'inference',
    n: 5,
    title: 'Inference',
    blurb: 'The anchor project: serve a model on your DGX Spark and chase Fireworks, one optimization at a time.',
    lessons: [
      {
        slug: 'bandwidth-bound',
        title: 'Why ~17 tokens per second?',
        question: 'Why is LLM decoding limited by memory speed, and how fast should my Spark be before I run anything?',
        why: 'One division predicts your server\'s speed. Every optimization in this track is a way around it.',
        build: 'Predict tokens/sec from bandwidth and model size, measure it, and explain the gap.',
      },
      {
        slug: 'baseline-vs-fireworks',
        title: 'Baseline: my Spark vs Fireworks.',
        question: 'How does a naive model server on my own hardware compare to a commercial inference API?',
        why: 'You cannot improve what you have not measured. This is the scoreboard for the whole track.',
        build: 'A streaming server on the Spark and a benchmark harness measuring TTFT, tokens/sec and p99 against Fireworks.',
      },
      {
        slug: 'memory-math',
        title: 'How much memory does a model need?',
        question: 'How much memory do the weights, the KV cache and activations take, and how many users fit?',
        why: 'Decides which models you can serve, at what context length, for how many people.',
        build: 'A calculator for weights + KV cache, checked against real memory readings on the Spark.',
      },
      {
        slug: 'kv-cache',
        title: 'The KV cache, by hand.',
        question: 'What exactly does the KV cache store, and how much does it save?',
        why: 'The most important inference optimization, and the thing every later trick builds on.',
        build: 'Add a KV cache to your own GPT-2, measure the speedup, and watch memory grow with length.',
      },
      {
        slug: 'batching',
        title: 'Batching and continuous batching.',
        question: 'Why does serving many users at once make each token cheaper, and what is continuous batching?',
        why: 'The reason inference companies make money. It turns spare compute into throughput.',
        build: 'Static batching, then continuous batching, in your server; plot throughput vs latency.',
      },
      {
        slug: 'prefix-caching',
        title: 'Paged attention and prefix caching.',
        question: 'How do servers share KV cache between requests with the same prefix, and when do they evict it?',
        why: 'System prompts and chat history repeat constantly. Reusing them cuts time to first token.',
        build: 'Prefix cache with TTL and LRU eviction in your server; measure TTFT on repeated system prompts.',
      },
      {
        slug: 'quantization',
        title: 'Quantization.',
        question: 'What do you lose when you store weights in 8 or 4 bits, and what do you gain?',
        why: 'Halving bytes per weight roughly doubles decode speed on a bandwidth-bound machine.',
        build: 'Serve the same model in bf16, fp8, int4; measure speed and quality on a small eval.',
      },
      {
        slug: 'speculative-decoding',
        title: 'Speculative decoding.',
        question: 'How can a small model make a big model faster without changing its output at all?',
        why: 'The trick you are fascinated by. Implementing it teaches sampling, verification and probability.',
        build: 'Implement speculative sampling from the paper, prove the output distribution matches, and tune draft length.',
      },
      {
        slug: 'serving-engines',
        title: 'Inside vLLM and SGLang.',
        question: 'What do production inference engines do that your server does not yet?',
        why: 'Reading real systems code is how you level up after building your own.',
        build: 'Benchmark vLLM and SGLang on the Spark against your server, then trace one request through vLLM\'s code.',
      },
      {
        slug: 'flash-attention',
        title: 'FlashAttention and kernels.',
        question: 'Why is attention slow on long contexts, and how does FlashAttention fix it without changing the math?',
        why: 'Your first step into GPU kernels, and listed in research engineer roles (new attention mechanisms).',
        build: 'Write naive attention, then a tiled version in Triton; compare speed and memory.',
        source: 'Anthropic research engineer posting',
      },
    ],
  },
  {
    id: 'training',
    n: 6,
    title: 'Training',
    blurb: 'From numbers and memory to training your own models end to end.',
    lessons: [
      {
        slug: 'number-formats',
        title: 'fp32, bf16, fp16, fp8.',
        question: 'How are decimal numbers stored in bits, and why did everyone switch to bf16?',
        why: 'Precision vs range decides whether training is stable. You mixed these up; most people do.',
        build: 'Decode floats bit by bit, then train the same model in fp16 and bf16 and watch one blow up.',
      },
      {
        slug: 'training-memory',
        title: 'Why training needs so much memory.',
        question: 'Why does training a model take many times the memory of running it?',
        why: 'Optimizer states, gradients and activations decide what you can train on the Spark.',
        build: 'Predict and measure memory for training a 1B model; then cut it with checkpointing and 8-bit Adam.',
      },
      {
        slug: 'tokenizers',
        title: 'Tokenizers.',
        question: 'What is a token, and how does a tokenizer decide where words split?',
        why: 'Token counts set your costs, context limits and odd model failures (spelling, numbers).',
        build: 'Implement byte-pair encoding from scratch and train it on your own text.',
      },
      {
        slug: 'tiny-lm',
        title: 'Train a small LM, end to end.',
        question: 'What does the full loop of training a language model actually look like?',
        why: 'The step you have never done at scale: data, tokenizer, model, training, eval, in one pipeline.',
        build: 'Train a ~100M parameter model on the Spark from raw text to a checkpoint you can sample from.',
      },
      {
        slug: 'data-pipelines',
        title: 'Data a model can eat.',
        question: 'How do you turn raw text like Wikipedia into training data a model learns well from?',
        why: 'Listed in research engineer roles. Data quality matters more than model tricks.',
        build: 'Clean, deduplicate, filter and pack a Wikipedia dump; measure the effect on your tiny LM.',
        source: 'Anthropic research engineer posting',
      },
      {
        slug: 'draft-model',
        title: 'Train your own draft model.',
        question: 'Can I distill a small model that predicts what my big model will say?',
        why: 'Connects training back to inference: a better draft model means faster speculative decoding.',
        build: 'Distill a draft model for your served model and measure the acceptance-rate gain.',
      },
      {
        slug: 'lora',
        title: 'Fine-tuning and LoRA.',
        question: 'How do you adapt a big model by training only a tiny fraction of it?',
        why: 'The cheapest way to specialize a model, and a good look at low-rank math.',
        build: 'LoRA fine-tune a model on the Spark for a task you care about; compare to full fine-tuning on a small one.',
      },
      {
        slug: 'architecture-compute',
        title: 'Comparing transformer variants.',
        question: 'How do you compare the compute efficiency of two transformer designs fairly?',
        why: 'Listed in research engineer roles. MHA vs GQA vs MQA is a real tradeoff in serving cost.',
        build: 'Train two small variants at equal compute; compare loss, FLOPs, memory and decode speed.',
        source: 'Anthropic research engineer posting',
      },
      {
        slug: 'distributed-training',
        title: 'Training on many GPUs.',
        question: 'How do you split a model and its training across many GPUs?',
        why: 'Scaling training jobs to thousands of GPUs is a core research engineer skill.',
        build: 'Simulate data, tensor and pipeline parallelism with multiple processes; write down how each would scale.',
        source: 'Anthropic research engineer posting',
      },
    ],
  },
  {
    id: 'eval',
    n: 7,
    title: 'Evaluation',
    blurb: 'Knowing whether something actually got better.',
    lessons: [
      {
        slug: 'why-evals-are-separate',
        title: 'Why is the eval separate?',
        question: 'If the evaluator and the model are both just models, why are they different systems?',
        why: 'A confusion you named. Getting this right is what separates a demo from a result.',
        build: 'Score a model with a judge that shares its blind spots, watch it lie, then build an independent check.',
      },
      {
        slug: 'ranking-metrics',
        title: 'Ranking metrics and eval sets.',
        question: 'How do you prove a new ranker is better: which metric, which data, how sure?',
        why: 'Your current work. The eval set matters more than the metric.',
        build: 'NDCG, MRR and MAP by hand; then build an eval set for your cross-encoder with confidence intervals.',
        source: 'work',
      },
      {
        slug: 'statistics-for-evals',
        title: 'Is that improvement real?',
        question: 'When a score goes from 71.2 to 72.0, is that real or noise?',
        why: 'Most "wins" in ML are noise. Bootstrap and paired tests fix that.',
        build: 'Bootstrap confidence intervals and a paired test on two model runs; find how many examples you need.',
      },
      {
        slug: 'llm-judges',
        title: 'LLMs as judges.',
        question: 'When can you trust a model to grade another model?',
        why: 'Cheap evals at scale, with biases you have to measure (position, length, self-preference).',
        build: 'Build a judge, measure its agreement with your own labels, and catch its position bias.',
      },
      {
        slug: 'attention-viz',
        title: 'Seeing attention.',
        question: 'What is a model looking at when it predicts the next token?',
        why: 'Listed in research engineer roles, and a good way to make attention concrete.',
        build: 'An interactive visualization of attention between tokens for your own GPT-2.',
        source: 'Anthropic research engineer posting',
      },
    ],
  },
  {
    id: 'agents',
    n: 8,
    title: 'Agents & RL',
    blurb: 'Long tasks, environments, rewards: how models learn to act.',
    lessons: [
      {
        slug: 'context-management',
        title: 'Managing context.',
        question: 'What should go into a model\'s context window, and what happens when it fills up?',
        why: 'You do this well by instinct. This makes it measurable: compaction, retrieval, memory.',
        build: 'Run an agent on a long task with three context strategies and measure success rate and cost.',
      },
      {
        slug: 'long-horizon',
        title: 'What makes a task long-horizon?',
        question: 'Why do agents that succeed at 10-step tasks fail at 100-step ones?',
        why: 'Listed in Code RL roles. Error compounds; you can put numbers on it.',
        build: 'Measure per-step reliability on a task suite and predict long-task success from it.',
        source: 'Anthropic Code RL posting',
      },
      {
        slug: 'rl-environments',
        title: 'What is an RL environment?',
        question: 'What is an environment in reinforcement learning, and how do you build one for coding?',
        why: 'The core of Code RL work: tasks, sandboxes, and a loop a model can learn from.',
        build: 'A gym-style environment of small coding tasks running in a sandbox.',
        source: 'Anthropic Code RL posting',
      },
      {
        slug: 'verifiers-rewards',
        title: 'Rewards and verifiers.',
        question: 'How do you turn "good code" into a number a model can learn from without being gamed?',
        why: 'Listed in Code RL roles. Reward hacking is what happens when this is wrong.',
        build: 'Write verifiers for your environment, then try to game them yourself before a model does.',
        source: 'Anthropic Code RL posting',
      },
      {
        slug: 'dpo',
        title: 'Preference tuning with DPO.',
        question: 'How do you train a model on "this answer is better than that one"?',
        why: 'You read about DPO and PPO. Implementing DPO makes the loss function make sense.',
        build: 'Implement DPO from the paper and tune a small model on preference pairs.',
      },
      {
        slug: 'grpo',
        title: 'RL with verifiable rewards.',
        question: 'How does RL with automatic rewards (like GRPO) teach a model to solve problems?',
        why: 'How current reasoning models are trained. Runs on a single Spark at small scale.',
        build: 'Train a small model with GRPO on your coding environment and watch reward and behavior change.',
      },
      {
        slug: 'agent-harness',
        title: 'Inside an agent harness.',
        question: 'What does a coding agent harness actually do around the model?',
        why: 'You built one with AST lookups. This adds tool design, sandboxing and recovery.',
        build: 'A minimal coding agent: tools, sandbox, retries, and a trace viewer to see what it did.',
      },
    ],
  },
];

// The opening chapter: a suggested first path through the map.
export const startHere = [
  'latency-numbers',
  'stack-and-heap',
  'processes-threads-gil',
  'waiting-vs-working',
  'bandwidth-bound',
  'baseline-vs-fireworks',
];

export const allLessons = tracks.flatMap((t) => t.lessons.map((l) => ({ ...l, track: t })));
export const findLesson = (slug: string) => allLessons.find((l) => l.slug === slug);
