import { readFileSync } from 'node:fs';
import YAML from 'js-yaml';
import {
  resolveSpecPath,
  validate,
  type ValidationResult,
} from './schema-registry.js';

export interface ReadResult {
  data: unknown;
  validation: ValidationResult;
}

export function parseSpec(filePath: string): unknown {
  const absolutePath = resolveSpecPath(filePath);
  let raw: string;
  try {
    raw = readFileSync(absolutePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Failed to read file ${filePath}: ${(error as NodeJS.ErrnoException).message}`,
    );
  }
  try {
    return YAML.load(raw);
  } catch (error) {
    throw new Error(
      `Failed to parse YAML in ${filePath}: ${(error as YAML.YAMLException).message}`,
    );
  }
}

export async function readSpec(filePath: string): Promise<ReadResult> {
  const data = parseSpec(filePath);
  const validation = await validate(filePath, data);
  if (!validation.valid) {
    // Soft warning — still return data so the agent can see what's there
    process.stderr.write(
      `[specify-cli] Existing file failed validation:\n${JSON.stringify(validation, null, 2)}\n`,
    );
  }
  return { data, validation };
}
