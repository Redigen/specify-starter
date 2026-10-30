interface ValidationError {
    path: string;
    message: string;
    params: Record<string, unknown>;
}
interface ValidationResult {
    valid: boolean;
    schema: string | null;
    file?: string;
    errors: ValidationError[];
    truncated?: number;
}
declare const PROJECT_ROOT: string;
/** Resolve spec paths relative to the configured project root, not process.cwd(). */
declare function resolveSpecPath(filePath: string): string;
declare function validate(filePath: string, data: unknown): Promise<ValidationResult>;

interface ReadResult {
    data: unknown;
    validation: ValidationResult;
}
declare function parseSpec(filePath: string): unknown;
declare function readSpec(filePath: string): Promise<ReadResult>;

interface WriteOptions {
    indent?: number;
}
declare function writeSpec(filePath: string, jsonInput: string | unknown, options?: WriteOptions): Promise<ValidationResult>;

/** Parse and validate a YAML spec without the soft-warning behavior of read. */
declare function validateSpec(filePath: string): Promise<ValidationResult>;

export { PROJECT_ROOT, type ReadResult, type ValidationError, type ValidationResult, type WriteOptions, parseSpec, readSpec, resolveSpecPath, validate, validateSpec, writeSpec };
