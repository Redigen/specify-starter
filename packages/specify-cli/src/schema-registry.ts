import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { minimatch } from 'minimatch';
import { parse as parseJSONC } from 'jsonc-parser';

export interface ValidationError {
  path: string;
  message: string;
  params: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  schema: string | null;
  file?: string;
  errors: ValidationError[];
  truncated?: number;
}

type SchemaMap = Record<string, string | string[]>;

interface CompiledValidator {
  glob: string;
  schemaName: string;
  validateFn: ValidateFunction;
}

function findProjectRoot(): string {
  // Honor explicit override first
  if (process.env.SPECIFY_ROOT) return process.env.SPECIFY_ROOT;
  // Walk up from cwd to find the nearest .vscode/settings.json
  let dir = process.cwd();
  for (let i = 0; i < 20; i++) {
    if (existsSync(resolve(dir, '.vscode/settings.json'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const detectedProjectRoot = findProjectRoot();
const PROJECT_ROOT = existsSync(detectedProjectRoot)
  ? realpathSync(detectedProjectRoot)
  : resolve(detectedProjectRoot);

/** Resolve spec paths relative to the configured project root, not process.cwd(). */
export function resolveSpecPath(filePath: string): string {
  return isAbsolute(filePath) ? resolve(filePath) : resolve(PROJECT_ROOT, filePath);
}

function loadSchemaMap(): { map: SchemaMap; source: string } {
  const settingsPath = resolve(PROJECT_ROOT, '.vscode/settings.json');
  if (!existsSync(settingsPath)) {
    return { map: {}, source: settingsPath };
  }
  const raw = readFileSync(settingsPath, 'utf8');
  const settings = parseJSONC(raw) as { 'yaml.schemas'?: SchemaMap };
  return { map: settings['yaml.schemas'] ?? {}, source: settingsPath };
}

const MAX_VALIDATION_ERRORS = 20;

function collectExternalRefs(value: unknown, refs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectExternalRefs(item, refs);
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref' && typeof child === 'string' && !child.startsWith('#')) {
      const refPath = child.split('#', 1)[0];
      if (refPath) refs.add(refPath);
    } else {
      collectExternalRefs(child, refs);
    }
  }
}

function registerSchema(
  ajv: Ajv,
  absolutePath: string,
  registered: Map<string, string>,
): string {
  const existingKey = registered.get(absolutePath);
  if (existingKey) return existingKey;
  if (!existsSync(absolutePath)) {
    throw new Error(`Schema file not found: ${absolutePath}`);
  }

  let schema: Record<string, unknown>;
  try {
    schema = JSON.parse(readFileSync(absolutePath, 'utf8')) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Failed to parse schema ${absolutePath}: ${(error as Error).message}`);
  }

  // A relative $id is resolved by Ajv against refs such as
  // "base.schema.json#/$defs/...". Without an $id, a file URL gives
  // relative external refs a stable base URI.
  const schemaId = schema['$id'];
  const key =
    typeof schemaId === 'string' && schemaId.length > 0
      ? schemaId
      : pathToFileURL(absolutePath).href;
  registered.set(absolutePath, key);

  try {
    ajv.addSchema(schema, key);
    const refs = new Set<string>();
    collectExternalRefs(schema, refs);
    for (const ref of refs) {
      if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(ref)) {
        throw new Error(`Remote $ref is not supported: ${ref}`);
      }
      registerSchema(ajv, resolve(dirname(absolutePath), ref), registered);
    }
  } catch (error) {
    throw new Error(`Failed to load schema ${absolutePath}: ${(error as Error).message}`);
  }

  return key;
}

async function compileValidators(): Promise<CompiledValidator[]> {
  const { map } = loadSchemaMap();
  const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true });
  addFormats(ajv);
  const registered = new Map<string, string>();
  const out: CompiledValidator[] = [];

  // Register every mapped schema and its local external dependencies in one
  // Ajv instance. Bundling these recursive schemas changes internal refs and
  // can make otherwise valid refs unresolvable.
  for (const [schemaPath, globOrGlobs] of Object.entries(map)) {
    const absolutePath = resolve(PROJECT_ROOT, schemaPath);
    const key = registerSchema(ajv, absolutePath, registered);
    const validateFn = ajv.getSchema(key);
    if (!validateFn) {
      throw new Error(`Failed to compile schema ${absolutePath}`);
    }
    const globs = Array.isArray(globOrGlobs) ? globOrGlobs : [globOrGlobs];
    for (const glob of globs) {
      out.push({ glob, schemaName: schemaPath, validateFn });
    }
  }
  return out;
}

let validatorsPromise: Promise<CompiledValidator[]> | null = null;

function getValidators(): Promise<CompiledValidator[]> {
  if (!validatorsPromise) {
    validatorsPromise = compileValidators();
  }
  return validatorsPromise;
}

export async function ensureInitialized(): Promise<void> {
  await getValidators();
}

function relativeFilePath(filePath: string): string {
  return relative(PROJECT_ROOT, resolveSpecPath(filePath)).replaceAll('\\', '/');
}

export async function validate(
  filePath: string,
  data: unknown,
): Promise<ValidationResult> {
  const validators = await getValidators();
  const file = relativeFilePath(filePath);
  const validator = validators.find(({ glob }) => minimatch(file, glob));
  if (!validator) {
    return {
      valid: false,
      schema: null,
      file,
      errors: [
        {
          path: '/',
          message: `No schema matched path "${file}"`,
          params: { code: 'NO_SCHEMA_MATCHED' },
        },
      ],
    };
  }

  if (validator.validateFn(data)) {
    return { valid: true, schema: validator.schemaName, file, errors: [] };
  }

  const errors = (validator.validateFn.errors ?? []) as ErrorObject[];
  return {
    valid: false,
    schema: validator.schemaName,
    file,
    errors: errors.slice(0, MAX_VALIDATION_ERRORS).map((error) => ({
      path: error.instancePath || '/',
      message: error.message ?? 'validation error',
      params: error.params as Record<string, unknown>,
    })),
    ...(errors.length > MAX_VALIDATION_ERRORS
      ? { truncated: errors.length - MAX_VALIDATION_ERRORS }
      : {}),
  };
}

const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'generated']);

/** Return all project files covered by a schema mapping in VS Code settings. */
export async function listValidatableFiles(): Promise<string[]> {
  const validators = await getValidators();
  const files: string[] = [];

  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const file = relativeFilePath(absolutePath);
      if (validators.some(({ glob }) => minimatch(file, glob))) {
        files.push(absolutePath);
      }
    }
  }

  walk(PROJECT_ROOT);
  return files.sort();
}

export { PROJECT_ROOT };
