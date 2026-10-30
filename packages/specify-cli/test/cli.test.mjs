import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'js-yaml';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const CLI = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const SCREEN_SCHEMA = join(ROOT, 'specs/schemas/screen.schema.json');

function run(args, { root = ROOT, input } = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: root,
    env: { ...process.env, SPECIFY_ROOT: root },
    input,
    encoding: 'utf8',
  });
  assert.equal(result.error, undefined);
  return result;
}

function temporaryProject(t, schemaPath = SCREEN_SCHEMA) {
  const root = mkdtempSync(join(tmpdir(), 'specify-cli-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.vscode'), { recursive: true });
  mkdirSync(join(root, 'specs/screens'), { recursive: true });
  const mapping = schemaPath
    ? { [schemaPath]: 'specs/screens/*.yaml' }
    : {};
  writeFileSync(
    join(root, '.vscode/settings.json'),
    JSON.stringify({ 'yaml.schemas': mapping }),
  );
  return root;
}

test('validate --all validates every mapped project spec without $ref warnings', () => {
  const result = run(['validate', '--all']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK: validated \d+ file\(s\)/);
  assert.doesNotMatch(result.stderr, /failed to load schema|can't resolve reference/);
});

test('programmatic API rejects invalid screens and components with the mapped schema', async () => {
  const api = await import('specify-cli');
  assert.equal(typeof api.readSpec, 'function');
  assert.equal(typeof api.writeSpec, 'function');
  assert.equal(typeof api.validateSpec, 'function');

  const screen = await api.validate('specs/screens/__invalid__.yaml', { broken: {} });
  assert.equal(screen.valid, false);
  assert.match(screen.schema, /screen\.schema\.json$/);
  assert.equal(screen.errors[0].path, '/broken');
  assert.match(screen.errors[0].message, /required property 'path'/);

  const component = await api.validate('specs/components/__invalid__.yaml', {
    broken: { layers: 'not-an-array' },
  });
  assert.equal(component.valid, false);
  assert.match(component.schema, /component\.schema\.json$/);
  assert.equal(component.errors[0].path, '/broken/layers');
});

test('write accepts a valid top-level screen map and emits parseable YAML', (t) => {
  const root = temporaryProject(t);
  const input = JSON.stringify({ login: { path: '/login', layers: [] } });
  const result = run(['write', 'specs/screens/login.yaml'], { root, input });
  assert.equal(result.status, 0, result.stderr);
  const output = YAML.load(readFileSync(join(root, 'specs/screens/login.yaml'), 'utf8'));
  assert.deepEqual(output, JSON.parse(input));
});

test('write rejects an invalid screen and does not create a file', (t) => {
  const root = temporaryProject(t);
  const result = run(['write', 'specs/screens/broken.yaml'], {
    root,
    input: JSON.stringify({ broken: {} }),
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /required property 'path'/);
  assert.equal(existsSync(join(root, 'specs/screens/broken.yaml')), false);
});

test('write refuses validation-free output when no schema matches', (t) => {
  const root = temporaryProject(t, null);
  const result = run(['write', 'specs/screens/broken.yaml'], {
    root,
    input: JSON.stringify({ broken: {} }),
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NO_SCHEMA_MATCHED/);
  assert.equal(existsSync(join(root, 'specs/screens/broken.yaml')), false);
});

test('a missing schema file is fatal instead of being skipped', (t) => {
  const root = temporaryProject(t, '/definitely-missing-specify-schema/missing.schema.json');
  const result = run(['write', 'specs/screens/broken.yaml'], {
    root,
    input: JSON.stringify({ broken: {} }),
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Schema file not found/);
  assert.equal(existsSync(join(root, 'specs/screens/broken.yaml')), false);
});

test('validate reports invalid existing YAML and returns exit code 1', (t) => {
  const root = temporaryProject(t);
  writeFileSync(join(root, 'specs/screens/valid.yaml'), 'valid:\n  path: /valid\n  layers: []\n');
  writeFileSync(join(root, 'specs/screens/invalid.yaml'), 'invalid:\n  layers: []\n');
  const result = run(['validate', 'specs/screens/valid.yaml', 'specs/screens/invalid.yaml'], { root });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /required property 'path'/);
  assert.match(result.stderr, /FAILED: 1 invalid, 1 valid/);
});

test('read --compact returns machine-readable JSON without pretty printing', () => {
  const result = run(['read', 'specs/screens/home.yaml', '--compact']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(Object.keys(JSON.parse(result.stdout)), ['home']);
  assert.equal(result.stdout.trim().includes('\n'), false);
});

test('--help exits successfully and documents validation', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /specify-cli validate --all/);
});
