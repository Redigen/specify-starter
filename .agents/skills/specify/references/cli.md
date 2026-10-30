# CLI and validation

Run commands from the project root and use `npx --no-install` to require the
workspace package rather than downloading an unrelated package.

## Choose the smallest workflow

- Localized existing-file edit: patch YAML, then `validate`.
- Full-file generation or structured transformation: JSON `read`/`write`.
- CI or final verification: `npm run spec:validate`.

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
