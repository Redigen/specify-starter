# Evidence discipline: when and how to conclude anything

Read this file at the moment you are about to decide whether something "does not
work", whether to read compiler/runtime source, or whether to start diagnosing
a defect — not earlier and not by memory.

## Order of evidence

Claims about system behavior are proven in a strict order:

1. Compare with existing working artifacts of the same kind (the "Working
   examples in this starter" table in this skill's `SKILL.md`, the nearest
   screen/component spec).
2. Measure the actual result at runtime: DOM, computed styles, variable
   values, `specify-cli preview` output.
3. Only when these two disagree, read the implementation.

A conclusion drawn from reading the implementation while skipping this order
is invalid. Reading the implementation never overrides measured behavior: if
the code "should" break but the system works, your reading of the code is
wrong, not the system.

## The norm is the norm

When existing project artifacts behave the same way, that behavior is the
norm, not a defect — regardless of your expectations and of how it is
implemented. You do not redefine the norm. Disagreement with the norm is a
question to the user ("this is how it works, do you want it changed?"), not a
bug report and not a reason to investigate.

## No symptom — no diagnosis

You may state an observation outside your editing area, but you may not
diagnose it. "In file X, Y happens" is acceptable; "in file X there is a bug
because Z" is not, without a reproducible symptom and a user assignment.
Other people's code does not have to match your idea of correctness.

Diagnostics start only from a reproducible symptom: a failing check,
incorrect DOM, or a measured mismatch between the result and the spec.
Subjective impressions ("it looks wrong"), not understanding someone else's
code, and hypotheses about how it "could break" are not symptoms. No symptom
means no diagnostics — return to the task.

An investigation ends in exactly one of three ways:

1. The symptom is reproduced and localized **inside** your editing area → fix it.
2. The symptom is reproduced **outside** your editing area → describe it and stop.
3. The symptom is not reproduced → it does not exist; return to the task.

Continuing after any of these outcomes is a violation. Decide the step budget
for a hypothesis before starting and state it to yourself.

## Generator and runtime source

Reading generator/runtime source (`packages/`, `apps/*/src/lib/`,
`src/generated/`) is the **last** step of diagnosing an already-reproduced
symptom, never a discovery step. To find a pattern or confirm documented
behavior, use this skill's reference sections and the working-example tables
in `SKILL.md` instead. Before reading a generated file, check the DSL surface
matrix in `references/runtime-contracts.md` — it exists so this reading is
not needed.