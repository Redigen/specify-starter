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

## Load only what the task needs

| Task | Reference |
|---|---|
| App config, screens, components, layers, loops, expressions | `references/spec-model.md` |
| Layout, visual states, transitions, design tokens | `references/styles-and-tokens.md` |
| Visual quality: hierarchy, rhythm, interaction states, feedback, anti-slop | `references/design-quality.md` |
| Fetching, mutations, events, navigation, external logic; reactivity of `state`/`data`; worked list-filtering example | `references/data-and-actions.md` |
| Which fields actually reach the DOM: forwarded events, bindings, state selectors, inline layout | `references/runtime-contracts.md` |
| YAML/JSON workflow, schema selection, CLI errors | `references/cli.md` |

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
   Diagnostics outside the working area starts only from a reproducible
   symptom: a failing check, incorrect DOM, or a measured mismatch between the
   result and the spec. Subjective impressions ("it looks wrong"), not
   understanding someone else's code, and hypotheses about how it "could break"
   are not symptoms. No symptom means no diagnostics — return to the task.
   An investigation ends in exactly one of three ways: the symptom is
   reproduced and localized inside your editing area → fix it; the symptom is
   reproduced outside your editing area → describe it and stop; the symptom is
   not reproduced → it does not exist, return to the task. Continuing after any
   of these outcomes is a violation. Decide the step budget for a hypothesis
   before starting and state it to yourself.
4. For structural UI work, use the rendered output required by `AGENTS.md` for
   both rendered checks and the design-quality review. Return to the canonical
   workflow for the final aggregate check after all review fixes.

## Common mistakes

| Incorrect | Correct |
|---|---|
| Bare screen `{ "path": "/x" }` | `{ "x": { "path": "/x" } }` |
| `{ "frame": { "lay": "row" } }` | `{ "frame": { "styles": { "lay": "row" } } }` |
| `for`, `key`, `cond-if`, or `id` inside `styles` | Put identity and behavior fields on the layer itself; keep only visual/layout declarations in `styles` |
| `txt-wrap: true` or `false` | Use schema strings, usually `wrap` or `no-wrap` |
| `for` without `key` | Provide a stable unique `key` |
| Function call in `for`, such as `item in Object.entries(data.map)` | `for` accepts a value path; prepare an entry array in `data`, then use `entry[0]`/`entry[1]`. `{{ this }}` is not a loop alias; see [Conditions and loops](references/spec-model.md#conditions-and-loops) |
| `lay`/`lay-gap` on `text`, `image`, `vector`, `field`, `iframe`, or `canvas` | These layers do not declare layout styles; use a `frame`. Check the [DSL surface matrix](references/runtime-contracts.md#dsl-surface-matrix) before choosing fields |
| `cond-if` using the loop variable on the same layer as `for` | The condition wraps the loop; put item-dependent `cond-if` on a descendant |
| `{{ ... }}` inside `styles` | Styles compile to CSS; use static values, tokens, and CSS `calc()`/`min()`/`clamp()` |
| Conditional expression in `vector.file` or `image.file` for `source: assets` | Computed paths bypass the generator's asset-import step, so Vite cannot resolve them. Use separate static-file layers with `cond-if`; computed literal paths are supported in component props |
| Wrapped row that stays narrower than its parent | Wrapping does not size the row; set `lay-width: fill-container` when it should span the parent |
| `component-name: { ... }` in layers | `c.component-name: { ... }` |
| Invented logic export | Inspect or create the actual external module first |
| Literal or computed expression passed to `.propName` on a component invocation | Use an assignable target, such as `{{ state.field }}` or a parent's `{{ .propName }}`; see [Component](references/spec-model.md#component) |
| JSON write for a tiny commented-file edit | Patch YAML to preserve comments/layout |
| `lay-aspect-ratio: 1` | Use the schema string value, for example `"1 / 1"` |
| `txt-font`, `txt-break`, `txt-stroke`, or `stroke.dash` | These fields do not exist. Use `txt-family`; see [Position, appearance, and typography](references/styles-and-tokens.md#position-appearance-and-typography) and the stroke contract |
| Bare shadow object or raw CSS shadow shorthand | Use a `t.shadow.*` token or an array of shadow objects; see [Fill, stroke, shadow, and blur](references/styles-and-tokens.md#fill-stroke-shadow-and-blur) |
| Fixed-width cards that overflow narrow screens | Use wrapping and responsive dimensions from the start |
| `lay-gap: auto` in a content-width row | Give the row free space, usually with `lay-width: fill-container` |
| Assuming `c.field-*` or `c.slider-md` fills a column form | Set `styles.lay-width: fill-container` on the invocation |
| Reading entire token/component files for a small lookup | Query only the required group, props, and root styles |
| Rebuilding after every cosmetic YAML edit | Validate during editing; follow `AGENTS.md` for intermediate build/check and the final `verify` |
| `on-change`, `on-submit`, `on-keydown`, `id`, or `theme` on a `c.*` invocation | Only `props`, `cond-if`, `for`/`key`, `styles`, `this`, `on-click`, `on-mount`, `on-unmount` are forwarded; see [Runtime contracts](references/runtime-contracts.md#component-invocation) |
| `on-click` on a component expecting to identify an internal interaction | The handler is attached to the component root and receives bubbled clicks; use bindable props for typed component output |
| `selected: ...` on a parent expecting child styles | Declare `styles.selected` on the same node; see [Runtime contracts](references/runtime-contracts.md#interaction-state-selectors) |
| Reading a component instance in an expression, such as `{{ someList.total }}` | There is no component-instance expression; pass data through bindable props |
| Untyped inline callback in a handler, such as `items.some(x => ...)` | `svelte-check` fails with implicit `any`; keep filtering out of template expressions |
| `on-submit` on a node that also carries panel layout styles | Form layout styles are emitted normally; verify the rendered layout instead of assuming a `div`-only CSS rule |
| Trusting `classname` or another unknown key inside a layer | Layer schemas allow extra keys, so typos validate silently; `class` is the real field |
| Custom Playwright script or a second dev server for a visual check | `preview shot`, `preview check`, and `preview run` cover screenshots, overflow, console errors, and interactions; reuse a running server |
| Concluding "there is a bug in the implementation" from reading its code | Follow the order of evidence in `AGENTS.md`: compare with working artifacts, measure at runtime, and only then read the implementation — and only with a reproducible symptom |
| Reading generator/runtime source (`packages/`, `src/lib/`, `src/generated/`) to confirm documented behavior or to find a pattern | Use the reference sections and the "Working examples in this starter" table. Generator reading is the last step of diagnosing a reproduced symptom, never a discovery step |
| Deriving a filtered array in `data` from `state`, e.g. `visible: "{{ data.items.filter(...) }}"` | `data` expressions evaluate once. Filter in the template with `cond-if` inside the loop; see `references/data-and-actions.md`, "Reactivity" |
| `data.b` referencing `data.a` declared below it | Keys compile to `const` in order; a forward reference throws `Cannot access ... before initialization` and blanks the screen. Declare dependencies first |
| Listing the whole icon/token/component set "to see what exists" | Query the exact enum or file path for the values you actually reference; read only the component props you invoke |
| Re-reading a reference or token file already loaded in this session | Reuse what you read; open a file again only for a new, specific question |
| Reading `stores/`/`logic/` modules the task does not reference | Inspect an export only when you are about to call it through `run`/`stores`/`logic` |

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
