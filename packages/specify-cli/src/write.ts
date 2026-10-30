import { renameSync, rmSync, writeFileSync } from 'node:fs';
import YAML from 'js-yaml';
import {
  resolveSpecPath,
  validate,
  type ValidationResult,
} from './schema-registry.js';

export interface WriteOptions {
  indent?: number;
}

/**
 * Quoting policy applied as a post-processing pass on the dumped YAML.
 *
 * - Hex colors like #F5F5F5: must be quoted, otherwise the `#` starts a YAML comment.
 * - Template expressions like {{ state.x }}: must be quoted, otherwise YAML may parse
 *   the leading `{` as a flow-mapping indicator.
 * - YAML 1.1 booleans (yes/no/on/off) as scalar values: must be quoted to prevent
 *   parser coercion to boolean (PyYAML and other YAML 1.1 parsers do this).
 *
 * We dump with noCompatMode (YAML 1.2) but downstream parsers may still use YAML 1.1,
 * so we defensively quote these patterns.
 */
function postProcessYAML(yaml: string): string {
  let out = yaml;

  // Quote values starting with # (hex colors) — match `key: #XXX` style only
  out = out.replace(
    /(^|\n)(\s*)([A-Za-z0-9_.\-]+):\s*(#[0-9a-fA-F]{3,8})\s*$/gm,
    (_, lead, indent, key, hex) => `${lead}${indent}${key}: "${hex}"`,
  );

  // Quote values starting with {{ (template expressions) on the right-hand side
  out = out.replace(
    /(^|\n)(\s*)([A-Za-z0-9_.\-]+):\s*(\{\{[^}]*\}\}.*)$/gm,
    (_, lead, indent, key, expr) => `${lead}${indent}${key}: "${expr}"`,
  );

  // Quote YAML 1.1 boolean-looking scalars when used as bare scalar values
  out = out.replace(
    /(^|\n)(\s*)([A-Za-z0-9_.\-]+):\s*(yes|no|on|off)\s*$/gm,
    (_, lead, indent, key, val) => `${lead}${indent}${key}: "${val}"`,
  );

  return out;
}

export async function writeSpec(
  filePath: string,
  jsonInput: string | unknown,
  options: WriteOptions = {},
): Promise<ValidationResult> {
  const data: unknown =
    typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;

  const result = await validate(filePath, data);
  if (!result.valid) {
    process.stderr.write(JSON.stringify(result, null, 2) + '\n');
    return result;
  }

  const yaml = YAML.dump(data, {
    indent: options.indent ?? 2,
    lineWidth: 0, // never wrap long lines — preserves template strings
    noRefs: true, // forbid anchors & aliases — canonical form
    noCompatMode: true, // YAML 1.2 (closer to JSON)
    quotingType: '"',
    forceQuotes: false,
  });

  const finalYaml = postProcessYAML(yaml);
  const content = finalYaml.endsWith('\n') ? finalYaml : finalYaml + '\n';
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
