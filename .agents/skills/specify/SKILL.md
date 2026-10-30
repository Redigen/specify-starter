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
| Fetching, mutations, events, navigation, external logic | `references/data-and-actions.md` |
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

### Semantics — read the reference section

| Need | Source |
|---|---|
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
answer the question, validate a minimal example or inspect compiler code as a
last resort; do not invent syntax or guess.

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

The required workflow in the root `AGENTS.md` is the canonical checklist
(scope, validation, diff inspection, verification levels). Summary with the
skill-specific additions:

1. Identify the task, load only the relevant reference plus the closest existing
   spec, and choose the editing form: patch YAML for a localized change, or
   generate complete JSON and write it once through the CLI for a new large
   file or structured transformation.
2. Before writing decorative content, define the layout behavior: container
   widths, wrapping, narrow-screen behavior, and component sizing. Keep changes
   scoped; verify referenced IDs, props, tokens, assets, and exports. For
   scripted replacements, verify the expected match count and inspect the diff
   immediately.
3. Validate changed specs while editing, and run the application checks once the
   edits have settled (`build` regenerates `src/generated/`; `check` verifies
   it). On validation failure, read `errors[].path` and `errors[].message`,
   fix the source, and rerun; missing/failed schemas are errors, not skips.

   ```bash
   npx --no-install specify-cli validate path/to/changed.yaml
   npm run spec:validate
   npm run build -w specify-svelte-spa
   npm run check -w specify-svelte-spa
   ```

4. For structural UI work, perform browser verification when tooling is
   available. Otherwise state explicitly that visual verification was not run.

## Common mistakes

| Incorrect | Correct |
|---|---|
| Bare screen `{ "path": "/x" }` | `{ "x": { "path": "/x" } }` |
| `{ "frame": { "lay": "row" } }` | `{ "frame": { "styles": { "lay": "row" } } }` |
| `for` without `key` | Provide a stable unique `key` |
| `component-name: { ... }` in layers | `c.component-name: { ... }` |
| Invented logic export | Inspect or create the actual external module first |
| JSON write for a tiny commented-file edit | Patch YAML to preserve comments/layout |
| `lay-aspect-ratio: 1` | Use the schema string value, for example `"1 / 1"` |
| Fixed-width cards that overflow narrow screens | Use wrapping and responsive dimensions from the start |
| `lay-gap: auto` in a content-width row | Give the row free space, usually with `lay-width: fill-container` |
| Assuming `c.field-*` or `c.slider-md` fills a column form | Set `styles.lay-width: fill-container` on the invocation |
| Reading entire token/component files for a small lookup | Query only the required group, props, and root styles |
| Rebuilding after every cosmetic YAML edit | Validate during editing; run the final build/check after the edits settle |

## Definition of done

- Specs validate with a real matching schema.
- All source edits stay within the approved scope; any TypeScript fallback is
  justified by a specific declarative limitation.
- No generated files were manually edited; normal generation side effects are
  inspected and reported separately.
- References resolve and no unrelated formatting/comments were lost.
- Relevant application checks/build pass, or any pre-existing failure is
  reported precisely.
- For structural UI changes, visual verification was performed or explicitly
  reported as not run.
- Invented business content and contact details are identified as placeholders.
