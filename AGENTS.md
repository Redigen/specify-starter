# AGENTS.md — Specify Project Guidelines

## Project model

Specify is a declarative UI specification and compiler. UI, state, data, and
core interactions live in YAML under `specs/`; the Svelte SPA is generated from
those specs. TypeScript in `logic/` and `stores/` is a last resort for behavior
that the declarative actions cannot express.

## Golden rules

1. **Declarative first.** Use `get-data`, `post-data`, `set-state`,
   `navigate-to`, `set-notification`, and other spec actions before TypeScript.
2. **Never edit generated output:** `apps/specify-svelte-spa/src/generated/`,
   `specs/schemas/base.schema.json`, and `.vscode/components.code-snippets`.
   Edit `specs/schemas/base.template.json` when a base schema change is intended.
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

1. Read `.agents/skills/specify/SKILL.md`, then only the reference relevant to
   the task. Read the nearest existing screen/component before creating a new one.
2. Make the smallest safe change:
   - For a localized edit, patch YAML directly and preserve its comments/layout.
   - For full-file generation or structured transformations, JSON through
     `specify-cli write` is supported.
3. Validate every changed spec. From the repository root:

   ```bash
   npm run spec:validate
   # Or validate selected files:
   npx --no-install specify-cli validate specs/screens/home.yaml
   ```

4. Inspect the diff for unrelated rewrites, lost comments, and broken references.
5. Check the generated application after structural spec changes:

   ```bash
   npm run check -w specify-svelte-spa
   npm run build -w specify-svelte-spa
   ```

   After CLI changes also run:

   ```bash
   npm run test:cli
   npm run typecheck -w specify-cli
   ```

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

- Layers, expressions, components: `.agents/skills/specify/references/spec-model.md`
- Styles and tokens: `.agents/skills/specify/references/styles-and-tokens.md`
- Data, actions, logic: `.agents/skills/specify/references/data-and-actions.md`
- CLI and troubleshooting: `.agents/skills/specify/references/cli.md`
