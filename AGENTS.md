# AGENTS.md — Specify Project Guidelines

## Project model

Specify is a declarative UI specification and compiler. UI, state, data, and
core interactions live in YAML under `specs/`; the Svelte SPA is generated from
those specs. TypeScript in `logic/` and `stores/` is a last resort for behavior
that the declarative actions cannot express.

## Editing boundaries

This is the single source of truth for editing scope; the skill in
`.agents/skills/specify/` links here. The table limits what you may **edit**;
reading any file is always allowed.
By default, implement application tasks through YAML specs.

| Area | Default permission |
|---|---|
| `specs/screens/*.yaml`, `specs/components/*.yaml`, `specs/app.yaml`, `specs/tokens.yaml` | Primary implementation area |
| `apps/specify-svelte-spa/src/logic/` | Minimal TypeScript fallback when declarative actions cannot express the behavior |
| `apps/specify-svelte-spa/src/stores/` | Minimal shared state when local `state` and props are insufficient |
| Everything else (`specs/schemas/`, `packages/`, other `apps/` files, global CSS, assets, build/IDE config, dependencies, lockfiles) | Read-only unless the user's task explicitly includes it |

Decision order:

1. Reuse existing spec components, tokens, and declarative actions.
2. Implement UI, local state, data, navigation, and interactions in YAML.
3. If the DSL cannot express the behavior, inspect existing `logic/` and
   `stores/` exports, then add or change the smallest fallback. State which
   behavior needs TypeScript and why the declarative path is insufficient.
4. If work outside the table is needed and the user's request does not already
   cover it (including new assets, fonts, or icons), stop, name the files and
   changes, and ask the user for approval before editing.

Rules for all edits (manual or scripted):

- Do not weaken schemas or validation, add hand-written Svelte components, or
  change the compiler/runtime for an ordinary UI task.
- A failing check does not expand scope: fix errors you introduced; report
  unrelated or infrastructure failures instead of patching them.
- An explicit user request to change a specific area (compiler, CLI, schemas,
  config, assets, agent instructions) authorizes that area only, not unrelated cleanup.
- Standard generation/build commands may update their normal outputs
  (`src/generated/`, `specs/schemas/base.schema.json`,
  `.vscode/components.code-snippets`, compiler-managed fields in `index.html`
  and `app.webmanifest`). Report these changes separately and never hand-edit them.

## Golden rules

1. **Declarative first.** Use `get-data`, `post-data`, `set-state`,
   `navigate-to`, `set-notification`, and other spec actions before TypeScript.
2. **Never edit generated output:** `apps/specify-svelte-spa/src/generated/`,
   `specs/schemas/base.schema.json`, and `.vscode/components.code-snippets`.
   Edit `specs/schemas/base.template.json` only when the user explicitly asks
   for a base schema change.
3. **Use design-system tokens** for shared color, spacing, sizing, and typography
   (`t.color.*`, `t.spacing.*`, `t.typography.*`, etc.). Local numeric dimensions,
   offsets, and durations are allowed when consistent with nearby specs.
4. Invoke custom components in `layers` with the `c.` prefix.
5. Use local `state` and bindable props before introducing a global store.
6. Do not embed function or class implementations in specs. Expressions in
   `{{ ... }}` and calls to existing functions through `run` are allowed.
7. Verify that referenced components, props, tokens, assets, routes, and
   logic/store exports actually exist. Schema validation does not replace these
   semantic checks.

## Required workflow

1. Read `.agents/skills/specify/SKILL.md`, then only the references relevant to
   the task. Read the nearest existing screen/component before creating a new one.
2. Make the smallest safe change:
   - For a localized edit, patch YAML directly and preserve its comments/layout.
   - For full-file generation or structured transformations, use JSON through
     `specify-cli write`. For a new large screen, generate the complete JSON in
     `/tmp` and write it once instead of assembling YAML through many appends.
   - For scripted replacements, define the expected match count. If the actual
     count differs, stop and narrow the selector. Inspect the resulting diff
     immediately; indentation alone is not a unique semantic selector.
3. Validate every changed spec. From the repository root:

   ```bash
   npm run spec:validate
   # Or validate selected files:
   npx --no-install specify-cli validate specs/screens/home.yaml
   ```

4. Inspect the diff for unrelated rewrites, lost comments, and broken references.
   Run `git status --short` (it also lists new untracked files, unlike
   `git diff --name-only`) and confirm every changed source file is inside the
   editing table above; list files produced by standard generation separately.
5. Check the generated application after structural spec changes (`build`
   regenerates `src/generated/`; `check` verifies it and does not regenerate):

   ```bash
   npm run build -w specify-svelte-spa
   npm run check -w specify-svelte-spa
   ```

   After CLI changes also run:

   ```bash
   npm run test:cli
   npm run typecheck -w specify-cli
   ```

6. For structural UI changes, verify the rendered application when browser
   tooling is available: the target route, narrow and desktop viewports, dark
   theme, and the main interactions. Do not treat an HTTP 200 response as a
   rendering check. If browser verification is unavailable, explicitly report
   that it was not performed.

## CLI boundary

`.vscode/settings.json` → `yaml.schemas` is the source of truth for selecting a
schema by file path. Missing, unreadable, or uncompilable schemas are errors;
writes must never silently skip validation.

```bash
# YAML -> JSON (add --compact for one-line output)
npx --no-install specify-cli read specs/screens/home.yaml > /tmp/home.json

# JSON -> validated YAML; screen/component files require their top-level ID map
npx --no-install specify-cli write specs/screens/home.yaml < /tmp/home.json

# Validate existing YAML without converting it
npx --no-install specify-cli validate --all
```

`write` rewrites the entire file and does not preserve YAML comments. Do not use
it for a small edit when preserving the existing file layout matters. On a
validation error, read `path` and `message`, fix the input, and rerun validation.

## Source map

- `specs/app.yaml`: global config, themes, integrations, notifications.
- `specs/tokens.yaml`: themes and their design-token groups.
- `specs/screens/`: screen definitions (`path`, `data`, `state`, `layers`).
- `specs/components/`: reusable definitions (`props`, `state`, `layers`).
- `apps/specify-svelte-spa/src/logic/`: fallback TypeScript functions.
- `apps/specify-svelte-spa/src/stores/`: fallback cross-screen reactive state.

## Task references

- App config, screens, layers, expressions, components: `.agents/skills/specify/references/spec-model.md`
- Styles and tokens: `.agents/skills/specify/references/styles-and-tokens.md`
- Data, actions, logic: `.agents/skills/specify/references/data-and-actions.md`
- CLI and troubleshooting: `.agents/skills/specify/references/cli.md`
