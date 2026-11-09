# CLI and validation

Run commands from the project root and use `npx --no-install` to require the
workspace package rather than downloading an unrelated package.

## Choose the smallest workflow

- New screen/component: create complete YAML directly, then `validate`; no
  intermediate JSON or generator is required.
- Localized existing-file edit: patch YAML, then `validate`.
- Structured transformation of existing YAML: JSON `read`/`write`, accounting
  for reformatting and comment loss.
- Repository-wide spec validation: `npm run spec:validate`.
- Final application verification after all edits and review fixes:
  `npm run verify` (see the root `AGENTS.md` workflow).

```bash
# Existing YAML -> JSON; warnings do not prevent reading invalid existing data
npx --no-install specify-cli read specs/screens/home.yaml

# One-line JSON for machine processing
npx --no-install specify-cli read specs/screens/home.yaml --compact

# Validate one or more existing YAML files; any failure exits 1
npx --no-install specify-cli validate specs/screens/home.yaml specs/app.yaml

# Discover and validate every file covered by yaml.schemas
npx --no-install specify-cli validate --all

# JSON -> validated YAML
npx --no-install specify-cli write specs/screens/home.yaml < /tmp/home.json
```

`read` performs soft validation so an agent can inspect an invalid existing
file. `validate` and `write` are strict. A missing schema match, missing schema
file, malformed schema, or failed schema compilation is an error. Writes never
silently skip validation.

`write` rewrites the whole file atomically and does not preserve comments or
the original YAML layout. Avoid it for localized edits to commented files.
The destination directory must already exist.

## Rendered verification: `preview`

`preview` commands render the SPA in an installed headless Chrome/Chromium
through `playwright-core`; no Playwright browser download is required. They
reuse a running dev server (ports 5173/5199/4173, or `SPECIFY_PREVIEW_URL`),
start `vite` only when none responds, and stop only the processes they started.
Use `shot` for visual-review screenshots, `check` for rendered assertions, and
`run` for interaction scenarios. Choose only the commands required by the task;
they are not a mandatory sequence.

```bash
# Screenshots at several viewports, optionally full page or a section
npx --no-install specify-cli preview shot --path /landing --widths 390,1440 --full-page --out /tmp/landing

# Dark-theme screenshots
npx --no-install specify-cli preview shot --path /landing --widths 390,1440 --theme dark --out /tmp/landing-dark

# Baseline overflow and console-error check
npx --no-install specify-cli preview check --path /landing --widths 390,1440 --overflow

# Add anchor and element-count assertions only when the screen requires them
npx --no-install specify-cli preview check --path /landing --widths 390,1440 \
  --overflow --anchors --spec specs/screens/landing.yaml --assert '#faq button:5'

# Declarative interaction scenario
npx --no-install specify-cli preview run /tmp/landing.steps.yaml
```

- `--widths 390,1440` and `--width 1440` are aliases of the same flag.
- `--overflow` enables the horizontal-overflow check. `check` also fails when
  the page logs `console.error` messages or throws uncaught exceptions.
- `--anchors` requires `--spec <screen.yaml>`: it reads `scroll-to.frame-id`
  targets, verifies each exists in the DOM, clicks the trigger whose label
  matches the spec text, and asserts the target scrolled into view.
- `--assert 'selector:count'` splits on the last `:`; do not pass selectors
  that contain a comma, because the list itself is comma-separated.
- Scenario steps: `goto`, `viewport`, `theme`, `click`, `fill`, `wait`,
  `wait-for` (wait until a selector is visible — prefer it over fixed `wait`s),
  `assert`, `assert-text`, `screenshot`; the command exits 1 on the first
  failing step.
- Theme changes and screenshots finish finite CSS/Web Animations before the
  result is captured, so a theme transition is shown in its final state.
  Infinite animations are left running and never block the command. `--wait`
  remains an additional page-load/business-logic delay; it is not needed to
  wait out CSS transitions. `preview check` does not measure color contrast or
  prove that computed colors match the selected theme.

Create interaction scenarios as temporary YAML files outside the repository:

```yaml
path: /landing
viewport: { width: 390, height: 844 }
theme: dark
steps:
  - assert-text: Book a demo
  - click: '#faq button'
  - wait-for: '#faq-answer'
  - assert: { selector: 'h1', count: 1 }
  - screenshot: /tmp/landing-after.png
```

`assert-text` searches for literal text in `document.body.innerText`. `assert`
counts matching elements and defaults to `count: 1`. See
`packages/specify-cli/README.md` for additional step examples.

Environment: `SPECIFY_CHROME_PATH` (Chrome/Chromium executable, standard
locations are probed otherwise), `SPECIFY_PREVIEW_URL` (existing server to
reuse), `SPECIFY_PREVIEW_PORT` (port for a self-started dev server; default
5199). Without a Chrome executable the commands fail with an explicit message
rather than reporting a false pass.

## Temporary probe screens (validate a minimal example)

When the references do not answer a behavior question, measure a tiny example
instead of reading the compiler. Schema selection is path-based (see below), so
a probe must live inside the mapped spec directories — a YAML file in `/tmp`
gets "No schema matched path" and is never compiled into the app either.

1. Create the smallest possible `specs/screens/__probe__.yaml` (and, only if the
   question is about component props, `specs/components/__probe__.yaml`). Give
   the probed nodes explicit `id` values so the scenario can assert them.
2. Validate it: `npx --no-install specify-cli validate specs/screens/__probe__.yaml`.
   Note that validation passes even for expressions that fail at runtime.
3. Write a `/tmp/probe.steps.yaml` scenario with `assert-text` / `assert`
   (see `preview run` above) and run it. A blank page with a console error such
   as `ReferenceError: Cannot access ... before initialization` is a valid
   measurement — it answers the question.
4. Delete the probe specs when done, then regenerate so the generated probe
   components disappear: `npm run build -w specify-svelte-spa`. Do not hand-edit
   or hand-delete files under `src/generated/`.
5. Reuse a running dev server; `preview` picks it up automatically. If you edit
   probe specs while a server is running, it regenerates on file watch.

Keep probes out of the final change: `git status --short` must not list them.

## Schema selection

`.vscode/settings.json` is both the IDE and CLI mapping source:

```jsonc
{
  "yaml.schemas": {
    "./specs/schemas/app.schema.json": "specs/app.yaml",
    "./specs/schemas/tokens.schema.json": "specs/tokens.yaml",
    "./specs/schemas/screen.schema.json": "specs/screens/*.yaml",
    "./specs/schemas/component.schema.json": "specs/components/*.yaml"
  }
}
```

The CLI finds the nearest ancestor containing `.vscode/settings.json`.
`SPECIFY_ROOT=/absolute/project/path` overrides discovery. Relative spec paths
are resolved from this root. Local external `$ref` files are loaded recursively;
remote `$ref` URLs are not supported.

## Errors

Validation errors are JSON on stderr:

```json
{
  "valid": false,
  "schema": "./specs/schemas/screen.schema.json",
  "file": "specs/screens/home.yaml",
  "errors": [
    {
      "path": "/login",
      "message": "must have required property 'path'",
      "params": { "missingProperty": "path" }
    }
  ]
}
```

For invalid spec input, fix the value at `path` and rerun the command. At most
20 AJV errors are returned; `truncated` reports how many additional errors were
omitted.

Validation errors do not expand the editing scope in `AGENTS.md`. For an
application task, report schema/mapping/CLI blockers instead of editing
`specs/schemas/`, `.vscode/settings.json`, or CLI code. Never weaken validation,
invent schema fields, or bypass validation to complete a write.

Common mistakes:

| Symptom | Fix |
|---|---|
| `No schema matched path` | Check `SPECIFY_ROOT`, file path, and `yaml.schemas` glob |
| Schema file/ref compilation error | Inspect mapping/refs and report the blocker; fix infrastructure only with explicit scope approval, never bypass validation |
| Screen `path` missing at `/` | Use `{ "screen-id": { "path": ... } }`, not a bare screen |
| Invalid nested layers | Check indentation in YAML and one layer type per list item |
| Unexpected full-file diff | Prefer a YAML patch over JSON `write` for a small change |

## Programmatic API

```ts
import { readSpec, validateSpec, writeSpec } from 'specify-cli';

const { data } = await readSpec('specs/screens/home.yaml');
const validation = await validateSpec('specs/screens/home.yaml');
if (validation.valid) {
  await writeSpec('specs/screens/home.yaml', data);
}
```

The package entry point has no CLI side effects. `SPECIFY_ROOT` must be set
before importing it when project-root auto-discovery is not appropriate.
