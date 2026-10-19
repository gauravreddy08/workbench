# Outline: agent-harness

Source: src/lessons/agent-harness.mdx. Curriculum: "Inside an agent harness." What does a coding
agent harness actually do around the model?

## The one big idea

The model only ever asks; the harness is the hands. Everything that touches the world, and every
limit, is ordinary code around the model, so most agent failures are harness failures. Tools are
an interface for a reader who sees only text, and the fences have to hold whatever the model is
told, because anything it reads can tell it things.

## Opening scene

The unattended overnight run on a few hundred tasks, after his two demo agents at TinyFish. Four
failures: a server command that never exits, so the batch waits forever; a huge log read whole,
so the request is too long and the run dies; an edit tool that returns just "Error", retried
twenty-six times for a few dollars of nothing; a README telling agents to pipe a script into the
shell, and it does.

## Wrong mental models B voices

- "Those are model failures; a smarter model fixes them."
- "Auto-approve commands that start with the test command, that's safe."
- "Set a timeout on the command and you're covered."
- "Pass rate went up by one, the change helped."

## Story beats

1. The four failures; none is the model's fault.
2. Origin: ReAct's thought, action, observation, with a regex guessing where the command starts;
   function calling made tool calls structured; SWE-agent showed designing tools for the model
   raised the score a lot over a plain shell; Anthropic spent more time tuning tools than the
   prompt.
3. The sink over the phone: you only talk, the friend has the hands. The loop. A tool call is a
   request. The model has no memory; it rereads everything every call.
4. Stopping: the happy ending is a reply with no tool calls; you can't rely on it. Step caps,
   budgets, wall clock, repeats, full context, a cut-off reply. Log every stop reason.
5. Tools for a reader who only sees text: the new teammate who can't ask questions. Errors are
   data, not exceptions: "Error" versus "found zero times, closest line is six". Coarse versus fine
   (his AST lookup was a good coarse tool). Outputs small, clipped head and tail, numbered lines,
   exit codes; every result is re-billed on every later call.
6. Fences: prompt injection can't be prompted away, so limit what any instruction can do. Path
   checks; a permission gate; the allowlist trap with a semicolon. The timeout story: on my Mac the
   timeout fired and the grandchild process was still alive; a fresh process group and killing the
   group left nothing. The CPU cap worked, the memory cap didn't on the Mac. Scrub the API key from
   the environment. A container with no network is what makes saying yes to everything safe.
7. Retries in two places: the API (wait longer each time, with randomness, give up eventually);
   tool failures go back to the model, not blind retries.
8. Cost: each call resends everything, so doubling the steps roughly quadruples input; prompt
   caching makes most of it a cheap re-read if the start stays byte-identical. Steps are the unit
   of both cost and time, which is why a coarse tool is worth more than it looks.
9. Traces and evals: one line per event; read the traces, not the summary. Hidden checks the agent
   can't edit; several runs per task; one extra pass is noise; reliability across runs. This eval
   is an RL environment with the learning removed.

## Numbers said aloud

- twenty-six identical calls
- "about a tenth of the price" for cached input
- "double the steps, roughly four times the input"

## Left to the written lesson

The wire format (tool_use and tool_result blocks, ids, is_error), parallel tool call rules, exact
stop-reason values, the to-do tool, the cost formula and predicts, backoff numbers, docker flags,
all Build It code, the sample repo and tasks, the viewer, the Measure table (no real model was run;
those are estimates), the Break It variants.
