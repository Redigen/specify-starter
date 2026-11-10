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
8. **Evidence discipline.** Before concluding that something "does not work",
   before reading compiler/runtime source, and before diagnosing any defect,
   follow `.agents/skills/specify/references/evidence.md`: order of evidence,
   the norm is the norm, no symptom — no diagnosis.

## Required workflow

1. Read `.agents/skills/specify/SKILL.md`, then only the references relevant to
   the task. Read the nearest existing screen/component before creating a new one.
   After discovery and before editing a UI, briefly describe the intended change,
   proportional to its scope. For new screens or structural changes, cover the
   target route, layout, interactions, responsive behavior, and affected shared
   components or navigation. For localized edits, describe only the affected
   behavior or layout. Keep shared changes minimal and verify affected layouts,
   not only the new screen. Changes within the authorized scope do not require
   an additional approval step when implementation is permitted. This does not
   override plan-only or read-only restrictions.
   For minor decision forks (a label, a default value, two equivalent
   approaches), pick a defensible option and note the decision in the final
   report instead of asking; ask only when an answer changes the direction of
   what is being built (audience, scope, route).
2. Make the smallest safe change:
   - For a localized edit, patch YAML directly and preserve its comments/layout.
   - For a new screen or component, create the complete YAML directly and
     validate it. Do not create intermediate JSON or a generator solely to
     satisfy the workflow. If tool payload limits require several bounded
     edits, validate the complete file afterward. Validate the initial skeleton
     and each substantial structural addition before adding the next one; do not
     accumulate several unverified hierarchy changes.
   - For a structured transformation of an existing YAML file, use JSON through
     `specify-cli read` and `specify-cli write`; remember that `write`
     reformats the file and removes comments. Incorporate any intervening YAML
     edits into the input rather than overwriting them with stale data.
   - After the initial write, prefer direct YAML patches for localized fixes.
     Regenerate for structural corrections only when simpler and safer.
   - After changing document hierarchy, inspect both the textual diff and the
     parsed structure: changed nodes must have the expected type, parent, and
     fields. Visual indentation alone does not prove structural correctness.
   - Do not repair hierarchy through repeated line-range indentation shifts.
     Rebuild the affected node or use a parser-backed structured transformation
     when more than a small localized patch is required.
   - Stop a repair loop when repeated attempts do not resolve the error, move it
     between neighboring nodes, or expand the affected area. Return to the last
     validated state and change the repair method instead of stacking patches.
   - Resolve syntax, schema, build, and behavior failures in that order. Do not
     change behavior while an earlier validation layer still fails. Judge a
     check by what it actually inspected, not merely by its exit code.
   - For scripted replacements, define the expected match count. If the actual
     count differs, stop and narrow the selector. Inspect the resulting diff
     immediately; indentation alone is not a unique semantic selector.
   - Use tools available in the current environment. Temporary scripts for
     generation and verification are allowed; keep them small and task-scoped.
     Keep these scripts in `/tmp`; adding scripts to the repository follows the
     same editing boundaries as other source changes. Do not repeat a failed
     command unchanged unless there is evidence of a transient failure. For
     transport, quoting, heredoc, or payload-size failures, correct the cause;
     simplify or change the method if the failure persists.
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
   Inspect new untracked source files explicitly: `git diff` and
   `git diff --check` do not review their contents.
5. After structural spec changes, build and check the generated application
   before browser verification (`build` regenerates `src/generated/`; `check`
   verifies it and does not regenerate). These are intermediate checks, not the
   final verification when later review may change the specs:

   ```bash
   npm run build -w specify-svelte-spa
   npm run check -w specify-svelte-spa
   ```

6. For structural UI changes, verify the rendered application when browser
   tooling is available: the target route, narrow and desktop viewports, dark
   theme, and the main interactions. Do not treat an HTTP 200 response as a
   rendering check. If browser verification is unavailable, explicitly report
   that it was not performed. When specs use loops, conditions, or anchors,
   check the expected item counts, initial conditional visibility, and working
   anchor targets: schema validation does not prove those fields are correctly
   placed.

   Prefer available browser tools and existing project verification scripts.
   The preferred tool is `specify-cli preview`. Choose only the commands needed
   for the required result; they are not a mandatory sequence:

   ```bash
   # Screenshots for visual review; add --theme dark for the dark-theme pass.
   npx --no-install specify-cli preview shot --path /route --widths 390,1440 --out /tmp/route

   # Baseline rendered check. Add --anchors --spec specs/screens/route.yaml
   # only when the screen uses scroll-to; add --assert for expected item counts.
   npx --no-install specify-cli preview check --path /route --overflow

   # Only for interactions that need a scenario; create the temporary YAML
   # scenario described in the CLI reference first.
   npx --no-install specify-cli preview run /tmp/route.steps.yaml
   ```

   `preview` reuses a running dev server (or starts Vite itself) and stops only
   the processes it started. Command syntax, flags, scenario format, and
   troubleshooting are in `.agents/skills/specify/references/cli.md`.
   Small temporary scripts without new dependencies are allowed; keep them in
   one task-scoped file with shared launch, connection, evaluation, screenshot,
   and teardown helpers instead of duplicating setup across scripts. Do not
   build custom testing infrastructure for an ordinary UI task. An installed
   browser alone does not require developing automation.

   Before starting a dev server, check for a suitable running instance and reuse
   it when appropriate. Track processes started by the agent and stop only those
   processes after verification, including when verification fails.

   For structural UI changes, also perform the design-quality review in
   `.agents/skills/specify/references/design-quality.md` using the rendered
   output. Fix concrete findings within scope and repeat the affected rendered
   checks after fixes. Automated `preview` checks do not replace that review.
7. Once all edits and review fixes have settled, run the final aggregate check.
   `verify` runs `spec:validate`, `build`, and `check` in sequence and catches
   Svelte-template errors that a valid spec can still produce:

   ```bash
   npm run verify
   ```

   After CLI changes also run:

   ```bash
   npm run test:cli
   npm run typecheck -w specify-cli
   ```

8. Before the final report, recheck `git status --short` and the final diff.
   Distinguish source changes from generated artifacts, report checks performed
   on the final state, and state any verification limitations.

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
- Design quality in specs: `.agents/skills/specify/references/design-quality.md`
- Data, actions, logic: `.agents/skills/specify/references/data-and-actions.md`
- Which fields reach the DOM (forwarded events, bindings, state selectors): `.agents/skills/specify/references/runtime-contracts.md`
- Evidence discipline, diagnosis rules, when to read the compiler: `.agents/skills/specify/references/evidence.md`
- CLI and troubleshooting: `.agents/skills/specify/references/cli.md`
