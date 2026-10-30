import { parseSpec } from './read.js';
import { validate, type ValidationResult } from './schema-registry.js';

/** Parse and validate a YAML spec without the soft-warning behavior of read. */
export async function validateSpec(filePath: string): Promise<ValidationResult> {
  const data = parseSpec(filePath);
  return validate(filePath, data);
}
