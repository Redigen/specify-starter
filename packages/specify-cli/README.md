# specify-cli

Strict JSON Schema validation for Specify YAML specs, with an optional YAML ↔
JSON bridge for structured edits and AI agents. Schema selection uses the same
`.vscode/settings.json` → `yaml.schemas` mapping as the YAML IDE extension.

## Why

Use the CLI as a validation boundary even when editing YAML directly. JSON is
optional: it is useful for full-file generation and programmatic transforms,
while a localized YAML patch better preserves comments and minimizes diffs.

The CLI never writes without a matching, successfully compiled schema. Missing
schema files, broken external `$ref`s, and missing path matches are errors.

## Install

In the monorepo, keep this package under `packages/specify-cli/` and the root
workspace configuration:

```json
{ "workspaces": ["packages/*", "apps/*"] }
```

Run `npm install` once, then from the project root:

```bash
npx --no-install specify-cli --help
```

`--no-install` prevents `npx` from downloading an unrelated registry package.

## Validate existing YAML

```bash
# One or more files
npx --no-install specify-cli validate specs/screens/login.yaml specs/app.yaml

# Every file covered by a configured schema glob
npx --no-install specify-cli validate --all
```

Successful validation exits 0. YAML parse errors, validation errors, and schema
loading errors exit 1. In this repository, `npm run spec:validate` runs the
`--all` form.

## Read YAML as JSON

```bash
npx --no-install specify-cli read specs/screens/login.yaml
npx --no-install specify-cli read specs/screens/login.yaml --compact
```

Default output is pretty JSON; `--compact` emits one line. Existing-file
validation failures are warnings on stderr, but JSON is still returned so an
agent can inspect and repair the data. Schema loading failures remain fatal.

## Write JSON as validated YAML

```bash
echo '{"login":{"path":"/login","layers":[]}}' \
  | npx --no-install specify-cli write specs/screens/login.yaml
```

Screen and component files require a top-level ID map. Do not pass a bare
`{"path":"/login"}` screen definition.

```bash
npx --no-install specify-cli read specs/screens/login.yaml > /tmp/login.json
# Modify /tmp/login.json
npx --no-install specify-cli write specs/screens/login.yaml < /tmp/login.json
```

Writing is atomic and requires the destination directory to exist. It rewrites
the entire file, normalizes formatting, expands references, and does **not**
preserve YAML comments. Prefer a YAML patch followed by `validate` for a small
edit to a commented file.

## Schema discovery and `$ref` handling

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

The CLI walks up from the current directory to find the nearest
`.vscode/settings.json`. Set `SPECIFY_ROOT=/absolute/project/path` to override
this. Relative spec paths are resolved from the selected root.

Mapped schemas are registered in one AJV instance. Local external `$ref` files
are discovered and registered recursively without bundling recursive schemas.
Remote `$ref` URLs are not supported.

## Validation error format

Errors are structured JSON on stderr:

```json
{
  "valid": false,
  "schema": "./specs/schemas/screen.schema.json",
  "file": "specs/screens/login.yaml",
  "errors": [
    {
      "path": "/login",
      "message": "must have required property 'path'",
      "params": { "missingProperty": "path" }
    }
  ]
}
```

Read `path` and `message`, fix the source, and retry. At most 20 AJV errors are
included; `truncated` reports the number omitted. A path with no matching
schema returns `params.code = "NO_SCHEMA_MATCHED"` and is invalid.

## YAML output policy

- two-space indentation;
- `noRefs: true` (no anchors/aliases);
- `noCompatMode: true` (YAML 1.2 behavior);
- double-quote preference and no line wrapping;
- defensive quoting for hex colors, `{{ ... }}`, and YAML 1.1 boolean-looking
  scalar values.

## Programmatic API

```ts
import { readSpec, validateSpec, writeSpec } from 'specify-cli';

const { data } = await readSpec('specs/screens/login.yaml');
const validation = await validateSpec('specs/screens/login.yaml');
if (validation.valid) {
  await writeSpec('specs/screens/login.yaml', data);
}
```

The library entry point does not execute the CLI. Set `SPECIFY_ROOT` before
importing the package when root auto-discovery is not appropriate.

## Development

```bash
npm run typecheck -w specify-cli
npm run test:cli
```

The integration suite covers schema selection, external refs, strict writes,
missing schemas, validation exit codes, compact reads, and the public API.

## License

MIT
