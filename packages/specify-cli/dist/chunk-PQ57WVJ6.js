// src/schema-registry.ts
import { existsSync, readdirSync, readFileSync, realpathSync } from "fs";
import { dirname, isAbsolute, relative, resolve } from "path";
import { pathToFileURL } from "url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { minimatch } from "minimatch";
import { parse as parseJSONC } from "jsonc-parser";
function findProjectRoot() {
  if (process.env.SPECIFY_ROOT) return process.env.SPECIFY_ROOT;
  let dir = process.cwd();
  for (let i = 0; i < 20; i++) {
    if (existsSync(resolve(dir, ".vscode/settings.json"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}
var detectedProjectRoot = findProjectRoot();
var PROJECT_ROOT = existsSync(detectedProjectRoot) ? realpathSync(detectedProjectRoot) : resolve(detectedProjectRoot);
function resolveSpecPath(filePath) {
  return isAbsolute(filePath) ? resolve(filePath) : resolve(PROJECT_ROOT, filePath);
}
function loadSchemaMap() {
  const settingsPath = resolve(PROJECT_ROOT, ".vscode/settings.json");
  if (!existsSync(settingsPath)) {
    return { map: {}, source: settingsPath };
  }
  const raw = readFileSync(settingsPath, "utf8");
  const settings = parseJSONC(raw);
  return { map: settings["yaml.schemas"] ?? {}, source: settingsPath };
}
var MAX_VALIDATION_ERRORS = 20;
function collectExternalRefs(value, refs) {
  if (Array.isArray(value)) {
    for (const item of value) collectExternalRefs(item, refs);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string" && !child.startsWith("#")) {
      const refPath = child.split("#", 1)[0];
      if (refPath) refs.add(refPath);
    } else {
      collectExternalRefs(child, refs);
    }
  }
}
function registerSchema(ajv, absolutePath, registered) {
  const existingKey = registered.get(absolutePath);
  if (existingKey) return existingKey;
  if (!existsSync(absolutePath)) {
    throw new Error(`Schema file not found: ${absolutePath}`);
  }
  let schema;
  try {
    schema = JSON.parse(readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse schema ${absolutePath}: ${error.message}`);
  }
  const schemaId = schema["$id"];
  const key = typeof schemaId === "string" && schemaId.length > 0 ? schemaId : pathToFileURL(absolutePath).href;
  registered.set(absolutePath, key);
  try {
    ajv.addSchema(schema, key);
    const refs = /* @__PURE__ */ new Set();
    collectExternalRefs(schema, refs);
    for (const ref of refs) {
      if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(ref)) {
        throw new Error(`Remote $ref is not supported: ${ref}`);
      }
      registerSchema(ajv, resolve(dirname(absolutePath), ref), registered);
    }
  } catch (error) {
    throw new Error(`Failed to load schema ${absolutePath}: ${error.message}`);
  }
  return key;
}
async function compileValidators() {
  const { map } = loadSchemaMap();
  const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true });
  addFormats(ajv);
  const registered = /* @__PURE__ */ new Map();
  const out = [];
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
var validatorsPromise = null;
function getValidators() {
  if (!validatorsPromise) {
    validatorsPromise = compileValidators();
  }
  return validatorsPromise;
}
async function ensureInitialized() {
  await getValidators();
}
function relativeFilePath(filePath) {
  return relative(PROJECT_ROOT, resolveSpecPath(filePath)).replaceAll("\\", "/");
}
async function validate(filePath, data) {
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
          path: "/",
          message: `No schema matched path "${file}"`,
          params: { code: "NO_SCHEMA_MATCHED" }
        }
      ]
    };
  }
  if (validator.validateFn(data)) {
    return { valid: true, schema: validator.schemaName, file, errors: [] };
  }
  const errors = validator.validateFn.errors ?? [];
  return {
    valid: false,
    schema: validator.schemaName,
    file,
    errors: errors.slice(0, MAX_VALIDATION_ERRORS).map((error) => ({
      path: error.instancePath || "/",
      message: error.message ?? "validation error",
      params: error.params
    })),
    ...errors.length > MAX_VALIDATION_ERRORS ? { truncated: errors.length - MAX_VALIDATION_ERRORS } : {}
  };
}
var IGNORED_DIRECTORIES = /* @__PURE__ */ new Set([".git", "node_modules", "dist", "generated"]);
async function listValidatableFiles() {
  const validators = await getValidators();
  const files = [];
  function walk(directory) {
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

// src/read.ts
import { readFileSync as readFileSync2 } from "fs";
import YAML from "js-yaml";
function parseSpec(filePath) {
  const absolutePath = resolveSpecPath(filePath);
  let raw;
  try {
    raw = readFileSync2(absolutePath, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read file ${filePath}: ${error.message}`
    );
  }
  try {
    return YAML.load(raw);
  } catch (error) {
    throw new Error(
      `Failed to parse YAML in ${filePath}: ${error.message}`
    );
  }
}
async function readSpec(filePath) {
  const data = parseSpec(filePath);
  const validation = await validate(filePath, data);
  if (!validation.valid) {
    process.stderr.write(
      `[specify-cli] Existing file failed validation:
${JSON.stringify(validation, null, 2)}
`
    );
  }
  return { data, validation };
}

// src/write.ts
import { renameSync, rmSync, writeFileSync } from "fs";
import YAML2 from "js-yaml";
function postProcessYAML(yaml) {
  let out = yaml;
  out = out.replace(
    /(^|\n)(\s*)([A-Za-z0-9_.\-]+):\s*(#[0-9a-fA-F]{3,8})\s*$/gm,
    (_, lead, indent, key, hex) => `${lead}${indent}${key}: "${hex}"`
  );
  out = out.replace(
    /(^|\n)(\s*)([A-Za-z0-9_.\-]+):\s*(\{\{[^}]*\}\}.*)$/gm,
    (_, lead, indent, key, expr) => `${lead}${indent}${key}: "${expr}"`
  );
  out = out.replace(
    /(^|\n)(\s*)([A-Za-z0-9_.\-]+):\s*(yes|no|on|off)\s*$/gm,
    (_, lead, indent, key, val) => `${lead}${indent}${key}: "${val}"`
  );
  return out;
}
async function writeSpec(filePath, jsonInput, options = {}) {
  const data = typeof jsonInput === "string" ? JSON.parse(jsonInput) : jsonInput;
  const result = await validate(filePath, data);
  if (!result.valid) {
    process.stderr.write(JSON.stringify(result, null, 2) + "\n");
    return result;
  }
  const yaml = YAML2.dump(data, {
    indent: options.indent ?? 2,
    lineWidth: 0,
    // never wrap long lines — preserves template strings
    noRefs: true,
    // forbid anchors & aliases — canonical form
    noCompatMode: true,
    // YAML 1.2 (closer to JSON)
    quotingType: '"',
    forceQuotes: false
  });
  const finalYaml = postProcessYAML(yaml);
  const content = finalYaml.endsWith("\n") ? finalYaml : finalYaml + "\n";
  const absolutePath = resolveSpecPath(filePath);
  const temporaryPath = `${absolutePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(temporaryPath, content);
    renameSync(temporaryPath, absolutePath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
  return result;
}

// src/validate.ts
async function validateSpec(filePath) {
  const data = parseSpec(filePath);
  return validate(filePath, data);
}

export {
  PROJECT_ROOT,
  resolveSpecPath,
  ensureInitialized,
  validate,
  listValidatableFiles,
  parseSpec,
  readSpec,
  writeSpec,
  validateSpec
};
//# sourceMappingURL=chunk-PQ57WVJ6.js.map