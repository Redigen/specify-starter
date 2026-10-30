---
name: specify
description: Create, inspect, modify, or validate Specify screens, components, layers, styles, tokens, data fetching, actions, and declarative UI logic in specs/. Use for YAML/JSON spec work, not for editing generated Svelte output.
---
# Specify — declarative UI specs

## When to use

Use this skill for work under `specs/`: screens, components, tokens, data,
forms, navigation, actions, and connections to existing logic/stores.

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
7. After editing, validate, inspect the diff, and check/build the application.

## Load only what the task needs

| Task | Reference |
|---|---|
| Screen/component structure, layers, loops, forms, expressions | `references/spec-model.md` |
| Layout, visual states, transitions, design tokens | `references/styles-and-tokens.md` |
| Fetching, mutations, events, navigation, external logic | `references/data-and-actions.md` |
| YAML/JSON workflow, schema selection, CLI errors | `references/cli.md` |

Also read the nearest existing spec of the same kind. It is the best source for
project naming, composition, and formatting conventions. Do not load the large
generated schemas unless a task requires an exact field or enum.

## Minimal valid screen

Examples in the references are JSON, the same data model accepted by
`specify-cli write`. Direct YAML edits have the identical structure.

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

1. Identify the task and load its reference plus the closest existing spec.
2. Choose the editing boundary:
   - localized existing-file change → patch YAML directly;
   - full generation or structured transformation → JSON through the CLI.
3. Keep changes scoped. Verify referenced IDs, props, tokens, assets, and exports.
4. Validate from the project root:

   ```bash
   npx --no-install specify-cli validate path/to/changed.yaml
   # Or all mapped specs:
   npm run spec:validate
   ```

5. If validation fails, read `errors[].path` and `errors[].message`, fix the
   source, and rerun. Missing/failed schemas are errors, not validation skips.
6. Inspect the final diff and run the relevant checks:

   ```bash
   npm run check -w specify-svelte-spa
   npm run build -w specify-svelte-spa
   ```

## Common mistakes

| Incorrect | Correct |
|---|---|
| Bare screen `{ "path": "/x" }` | `{ "x": { "path": "/x" } }` |
| `{ "frame": { "lay": "row" } }` | `{ "frame": { "styles": { "lay": "row" } } }` |
| `for` without `key` | Provide a stable unique `key` |
| `component-name: { ... }` in layers | `c.component-name: { ... }` |
| Invented logic export | Inspect or create the actual external module first |
| JSON write for a tiny commented-file edit | Patch YAML to preserve comments/layout |

## Definition of done

- Specs validate with a real matching schema.
- No generated files were manually edited.
- References resolve and no unrelated formatting/comments were lost.
- Relevant application checks/build pass, or any pre-existing failure is
  reported precisely.
