#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { readSpec } from './read.js';
import { writeSpec } from './write.js';
import { validateSpec } from './validate.js';
import {
  ensureInitialized,
  listValidatableFiles,
  type ValidationResult,
} from './schema-registry.js';

const VERSION = '0.1.0';

function usage(exitCode: 0 | 1 = 1): never {
  const output = `specify-cli v${VERSION}

Validate Specify YAML specs and optionally convert YAML <-> JSON.
Schemas and file globs are read from .vscode/settings.json (yaml.schemas).

USAGE
  specify-cli validate <file...>
      Parse and validate YAML files. Exit 1 on any error.
  specify-cli validate --all
      Validate every project file covered by a schema mapping.

  specify-cli read <file> [--compact]
      Parse YAML and output JSON. Existing-file validation errors are warnings;
      JSON is still returned. --compact disables pretty printing.

  specify-cli write <file>
      Read JSON from stdin, require a matching schema, validate, then write YAML.
      This rewrites the whole file and does not preserve YAML comments.

  specify-cli --help
  specify-cli --version

ENVIRONMENT
  SPECIFY_ROOT   Override the project root (default: nearest ancestor with .vscode/settings.json)

EXAMPLES
  specify-cli validate --all
  specify-cli read specs/screens/login.yaml > /tmp/login.json
  specify-cli write specs/screens/login.yaml < /tmp/login.json
  echo '{"new":{"path":"/new","layers":[]}}' | specify-cli write specs/screens/new.yaml
`;
  (exitCode === 0 ? process.stdout : process.stderr).write(output);
  process.exit(exitCode);
}

function commandError(file: string, error: unknown): ValidationResult {
  return {
    valid: false,
    schema: null,
    file,
    errors: [
      {
        path: '/',
        message: (error as Error).message,
        params: { code: 'SPEC_READ_ERROR' },
      },
    ],
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0) usage();

  const [cmd, ...rest] = argv;
  if (cmd === '--help' || cmd === '-h') usage(0);
  if (cmd === '--version' || cmd === '-v') {
    process.stdout.write(`specify-cli v${VERSION}\n`);
    return;
  }
  if (cmd !== 'read' && cmd !== 'write' && cmd !== 'validate') {
    process.stderr.write(`Unknown command: ${cmd}\n\n`);
    usage();
  }

  await ensureInitialized();

  if (cmd === 'read') {
    const compact = rest.includes('--compact');
    const files = rest.filter((argument) => argument !== '--compact');
    if (files.length !== 1) {
      process.stderr.write('Error: read requires exactly one <file> argument\n\n');
      usage();
    }
    try {
      const { data } = await readSpec(files[0]!);
      process.stdout.write(JSON.stringify(data, null, compact ? undefined : 2) + '\n');
    } catch (error) {
      process.stderr.write(`Error: ${(error as Error).message}\n`);
      process.exitCode = 1;
    }
    return;
  }

  if (cmd === 'validate') {
    const all = rest.includes('--all');
    const files = rest.filter((argument) => argument !== '--all');
    if ((all && files.length > 0) || (!all && files.length === 0)) {
      process.stderr.write('Error: use either validate <file...> or validate --all\n\n');
      usage();
    }
    const targets = all ? await listValidatableFiles() : files;
    if (targets.length === 0) {
      throw new Error('No files matched the configured schema mappings');
    }

    let validCount = 0;
    let invalidCount = 0;
    for (const file of targets) {
      let result: ValidationResult;
      try {
        result = await validateSpec(file);
      } catch (error) {
        result = commandError(file, error);
      }
      if (result.valid) {
        validCount += 1;
      } else {
        invalidCount += 1;
        process.stderr.write(JSON.stringify(result, null, 2) + '\n');
      }
    }
    if (invalidCount > 0) {
      process.stderr.write(
        `[specify-cli] FAILED: ${invalidCount} invalid, ${validCount} valid\n`,
      );
      process.exitCode = 1;
    } else {
      process.stdout.write(`[specify-cli] OK: validated ${validCount} file(s)\n`);
    }
    return;
  }

  if (rest.length !== 1) {
    process.stderr.write('Error: write requires exactly one <file> argument\n\n');
    usage();
  }
  const file = rest[0]!;
  let stdin: string;
  try {
    stdin = readFileSync(0, 'utf8');
  } catch {
    process.stderr.write('Error: failed to read JSON from stdin\n');
    process.exitCode = 1;
    return;
  }
  if (!stdin.trim()) {
    process.stderr.write('Error: no JSON input on stdin\n');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await writeSpec(file, stdin);
    if (!result.valid) {
      process.exitCode = 1;
      return;
    }
    process.stderr.write(`[specify-cli] OK: wrote ${file} (schema: ${result.schema})\n`);
  } catch (error) {
    const prefix = error instanceof SyntaxError ? 'invalid JSON on stdin' : 'write failed';
    process.stderr.write(`Error: ${prefix}: ${(error as Error).message}\n`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${(error as Error).message}\n`);
  process.exitCode = 1;
});
