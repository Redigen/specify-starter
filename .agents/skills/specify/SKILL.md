---
name: specify
description: Create, inspect, modify, or validate Specify screens, components, layers, styles, tokens, data fetching, actions, and declarative UI logic in specs/. Use for YAML/JSON spec work, not for editing generated Svelte output.
---
# Specify — declarative UI specs

## When to use

Use this skill for work under `specs/`: screens, components, tokens, data,
forms, navigation, actions, and connections to existing logic/stores.

## Editing scope

Before implementation read "Editing boundaries" in the root `AGENTS.md`; it is
the single source of truth. In short: edit specs by default, use `logic/` and
`stores/` only as a justified minimal fallback, and treat everything else as
read-only without explicit user approval. A failed check is not permission to
modify infrastructure; report the blocker instead.

## Core rules

1. Specs are the source of truth. Never edit generated Svelte output.
2. Prefer declarative actions over TypeScript. External logic/stores are a last
   resort; inspect the actual file and export before referencing them.
3. Invoke components as `c.<component-id>` and match their declared props.
4. Put style fields inside `styles`; use existing `t.*` design tokens where
   appropriate. Local numeric dimensions and durations can remain numeric.
5. Screen/component JSON requires a top-level ID map:
   `{ "screen-id": { "path": "/route", "layers": [] } }`.
6. Do not embed function/class implementations in specs. Template expressions
   and calls to existing functions through `run` are allowed.
7. After editing, validate, inspect the diff, and build/check the application.

## Build and discovery

- Screens and routes are auto-discovered: `vite-plugin-specify-svelte-spa`
  compiles every `specs/screens/*.yaml` during `npm run dev`/`build` into
  `src/generated/` and registers the routes in `src/generated/screens/index.ts`.
  No manual route registration exists.
- `specify-sync` (`npm run dev:sync`) regenerates only the asset/token enums in
  `specs/schemas/base.schema.json` and `.vscode/components.code-snippets`; it
  does not compile screens.
- `specify-cli` validates and converts YAML/JSON; it does not generate app code.

## Load knowledge at the moment of use

Read a reference **before writing the construct it covers**, not after and not
by memory. Match your next action to the row:

| You are about to… | Read first (section) |
|---|---|
| Add/edit a screen, component, `state`, `stores`, `logic`, `c.*` invocation, `{{ ... }}` expression | `references/spec-model.md` — and the "Checklist before writing a `c.*` invocation" in its Component section |
| Write a `for` loop or `cond-if` | `references/spec-model.md`, "Conditions and loops" — including its pre-write checklist |
| Put `{{ ... }}` into `data` or `state` | `references/data-and-actions.md`, "Data declarations" checklist + "Reactivity" |
| Add events, `set-state`, `set-props`, `navigate-to`, `scroll-to`, notifications | `references/data-and-actions.md`, "Event handlers" |
| Build a form or use `submit`/`reset` | `references/data-and-actions.md`, "Forms" |
| Write any `styles` value or add tokens | `references/styles-and-tokens.md` — "Layout reference" and "Position, appearance…" checklists |
| Decide interactive states, hover/focus/selected styling | `references/styles-and-tokens.md`, "Interactive states" + `references/runtime-contracts.md`, "Interaction-state selectors" |
| Ask "will this field reach the DOM / will this handler fire?" | `references/runtime-contracts.md` (DSL surface matrix), its "Checklist before asking why does it not work?" |
| Run validate/read/write/preview commands | `references/cli.md` |
| Conclude something "does not work" or start diagnosing | `references/evidence.md` — before reading any compiler/runtime source |
| Review rendered visual quality | `references/design-quality.md` |

Also read the nearest existing spec of the same kind. It is the best source for
project naming, composition, and formatting conventions. Do not load the large
generated schemas unless a task requires an exact field or enum.

## Where to find values

References contain DSL semantics and worked examples. Live artifacts remain the
source of truth for generated token values, asset lists, component contracts,
and exact conditional field shapes. Query them instead of copying project lists.

### Live values — query, do not copy

| Need | Source |
|---|---|
| Static DSL enums and field shapes (action parameters, align and gap values, notification types) | `specs/schemas/base.template.json` — grep the `$defs` key and read the lines around it, do not read the whole file |
| Valid token names and available theme names (always current) | generated enums in `specs/schemas/base.schema.json`: `$defs/themes`, `$defs/color`, `$defs/palette`, `$defs/spacing`, `$defs/radius`, `$defs/sizing`, `$defs/shadow`, `$defs/blur`, `$defs/easing`, `$defs/gradient`, plus the `t.typography.*` enum inside `typographyProps` |
| Current token values (what a name resolves to) | `specs/tokens.yaml` |
| Available assets and icon file names | the vector/image enum in `specs/schemas/base.schema.json`, or the file list in `assets/<category>/` |
| Component props and defaults | `.vscode/components.code-snippets` (generated from `specs/components/*.yaml`) or the component YAML itself |

### Working examples in this starter (read these instead of the compiler)

The starter's screens (`home.yaml`, `not-found.yaml`) are static. When a task
needs a mechanism they do not show, these components are the working artifacts
of that kind — read the 20–110 line YAML, not `packages/`:

| Mechanism | Working artifact |
|---|---|
| `for` + `key` over `state.*`, per-item `cond-if`, calling a `logic` helper | `specs/components/pagination.yaml` (+ `apps/specify-svelte-spa/src/logic/getPagination.ts`) |
| `for` over `props.*`, `in`/`out` transitions | `specs/components/snackbar-list.yaml` |
| `stores` registration and use | `specs/components/snackbar-md.yaml` |
| Bindable `.value` props, two-way binding | `specs/components/slider-md.yaml`, `specs/components/spin-button-sm.yaml`, `specs/components/field-md.yaml` |
| Localized content, `navigate-to`, `scroll-to` target | `specs/screens/not-found.yaml` |

If none of these matches the task's kind, say so and build the smallest version
from the reference examples. Do not substitute generator source for a missing
example.

### Semantics — read the reference section

| Need | Source |
|---|---|
| Does this declaration re-evaluate when `state`/props change? Deriving lists, filtering, expand/collapse UIs | `references/data-and-actions.md`, "Reactivity: what re-evaluates and what does not" — includes a verified worked example; do **not** read the compiler for this |
| Detailed DSL semantics and worked examples | The relevant reference above; these files are the self-contained local reference |
| What a value means and how it compiles | this skill's references first; compiler code only as a last resort |
| How a new screen is discovered and where routes come from | This skill, "Build and discovery"; no compiler reading needed |
| Form submission, native validation, `submit`/`reset` actions | `references/data-and-actions.md`, "Forms" |
| Interactive state styles and the CSS they compile to | `references/styles-and-tokens.md`, "Interactive states" |
| Theme inheritance, `uv-*` palettes, media breakpoints | `references/styles-and-tokens.md`, "Themes and inheritance" and "Responsive layout" |

`base.schema.json` and `components.code-snippets` are generated artifacts: never
edit them. Their token and asset enums are regenerated by `specify-sync` from
`specs/tokens.yaml` and `assets/`, so they are the live list of valid names —
query them for lookups instead of re-reading `tokens.yaml` or listing `assets/`.
Static DSL schema definitions live in `base.template.json`, which stays stable.
One caveat: `anyOf` also accepts arbitrary strings, so validation does not
reject an invented token or theme name — check the name against the enum
rather than trusting `validate` (golden rule 7). For the value behind a name,
read the token group in `specs/tokens.yaml`.

Read only the data needed for the current decision:

- For tokens, query the relevant group and its keys instead of paging through
  the entire `tokens.yaml`, including palettes.
- Before invoking a component, read its `props` and root `styles`. Read the full
  component only when its internal behavior matters.
- Check selected assets by exact path instead of listing the whole icon set.

Use targeted lookups rather than reading whole files. Start with the relevant
reference, then query the live artifact or schema. If sources disagree or do not
answer the question, measure a minimal probe screen (`references/cli.md`,
"Temporary probe screens"); inspect compiler code only as a last resort, to
explain a symptom you have already reproduced. Do not invent syntax or guess.

## Minimal valid screen

The example below is JSON, the same data model accepted by `specify-cli write`.
References use JSON and YAML; direct YAML edits have the identical structure.

```json
{
  "counter": {
    "path": "/counter",
    "state": { "count": 0 },
    "layers": [
      {
        "frame": {
          "styles": { "lay": "row", "lay-gap": "t.spacing.100" },
          "layers": [
            { "text": { "content": "{{ state.count }}" } },
            {
              "c.button-md": {
                "props": { "label": "+" },
                "on-click": {
                  "set-state": { "count": "{{ state.count + 1 }}" }
                }
              }
            }
          ]
        }
      }
    ]
  }
}
```

Before reusing `c.button-md`, verify its props in the current project.

## Execution workflow

Follow the required workflow in the root `AGENTS.md`; it is the single source
of truth for step order, verification levels, and final checks. This section
adds only skill-specific guidance:

1. Identify the task, load only the relevant reference plus the closest existing
   spec, and choose the editing form: patch YAML for a localized change, create
   a new screen/component directly as complete YAML, or use JSON `read`/`write`
   for a structured transformation of an existing file. Do not create an
   intermediate JSON file or generator merely to satisfy the workflow.
2. For a new screen or substantial layout rework, write the short Design Brief
   and derive its system invariants as described in
   `references/design-quality.md`. Before writing decorative content, define
   the layout behavior: container widths, wrapping, narrow-screen behavior, and
   component sizing. Keep changes scoped; verify referenced IDs, props, tokens,
   assets, and exports. For scripted replacements, verify the expected match
   count and inspect the diff immediately.
3. Use `references/cli.md` for command syntax and troubleshooting. On validation
   failure, read `errors[].path` and `errors[].message`, fix the source, and
   rerun; missing/failed schemas are errors, not skips. If a spec validates but
   the generated UI is wrong, inspect the generated output read-only and map the
   behavior back to the source layer. Never edit generated output or the
   compiler for an ordinary UI task.
4. For structural UI work, use the rendered output required by `AGENTS.md` for
   both rendered checks and the design-quality review. Return to the canonical
   workflow for the final aggregate check after all review fixes.

## Known error patterns live next to their constructs

There is no central "common mistakes" table: every known error pattern is
documented as a pre-write checklist **inside the reference section that covers
the construct**, at the moment you are about to write it:

- Loops and conditions: `references/spec-model.md`, "Conditions and loops".
- Component invocations and bindable props: `references/spec-model.md`,
  "Component" (and `references/runtime-contracts.md`, "Component invocation").
- Layout, typography, and token style fields:
  `references/styles-and-tokens.md` checklists in "Layout reference" and
  "Position, appearance, and typography".
- Reactivity and `data` derivation: `references/data-and-actions.md`,
  "Data declarations" and "Reactivity".
- Dropped fields and dead handlers: `references/runtime-contracts.md`,
  its "Checklist before asking why does it not work?".
- CLI/workflow mistakes: `references/cli.md`, "Common mistakes".

When a check fails or the render is wrong, look up the construct in the table
in "Load knowledge at the moment of use" above and read that section's
checklist before guessing a fix.

## Checkpoints

- **Before the first edit of a task:** the relevant reference section from the
  table above plus the nearest existing spec of the same kind; confirm every
  referenced component, prop, token, asset, route, and export exists.
- **After every edit:** `npx --no-install specify-cli validate <changed.yaml>`
  and inspect the diff for unrelated rewrites or lost comments.
- **Before the final report:** `git status --short`, the final diff, and the
  aggregate `npm run verify` required by `AGENTS.md`; report any skipped
  rendered checks explicitly.

## Definition of done

- Specs validate with a real matching schema.
- All source edits stay within the approved scope; any TypeScript fallback is
  justified by a specific declarative limitation.
- No generated files were manually edited; normal generation side effects are
  inspected and reported separately.
- References resolve and no unrelated formatting/comments were lost.
- The final `npm run verify` required by `AGENTS.md` passes, or any pre-existing
  failure is reported precisely.
- For structural UI changes, rendered checks cover the applicable routes,
  viewports, themes, and interactions, or skipped checks are explicitly
  reported.
- For structural UI changes, the design-quality review in
  `references/design-quality.md` uses rendered desktop/mobile output and
  produces concrete findings, or any skipped review is explicitly reported.
- Invented business content and contact details are identified as placeholders.
