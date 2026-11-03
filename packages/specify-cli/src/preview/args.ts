export interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

/** Parse `--flag`, `--flag value` and `--flag=value` forms. */
export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const body = token.slice(2);
    const equalsIndex = body.indexOf('=');
    if (equalsIndex >= 0) {
      flags[body.slice(0, equalsIndex)] = body.slice(equalsIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[body] = next;
      index += 1;
    } else {
      flags[body] = true;
    }
  }

  return { positionals, flags };
}

export function flagString(
  flags: Record<string, string | boolean>,
  name: string,
): string | undefined;
export function flagString(
  flags: Record<string, string | boolean>,
  name: string,
  fallback: string,
): string;
export function flagString(
  flags: Record<string, string | boolean>,
  name: string,
  fallback?: string,
): string | undefined {
  const value = flags[name];
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') {
    throw new Error(`Flag --${name} expects a value`);
  }
  return value;
}

export function requireFlagString(
  flags: Record<string, string | boolean>,
  name: string,
): string {
  const value = flagString(flags, name);
  if (!value) throw new Error(`Missing required flag --${name}`);
  return value;
}

export function flagNumber(
  flags: Record<string, string | boolean>,
  name: string,
  fallback: number,
): number {
  const value = flagString(flags, name);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Flag --${name} expects a positive number, got "${value}"`);
  }
  return parsed;
}

export function flagWidthList(
  flags: Record<string, string | boolean>,
  name: string,
  fallback: number[],
): number[] {
  // Accept both --width and --widths regardless of the caller's preferred alias.
  const raw = flagString(flags, 'widths') ?? flagString(flags, 'width');
  if (raw === undefined) return fallback;
  const widths = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (widths.length === 0) {
    throw new Error(`Flag --${name} expects comma-separated viewport widths`);
  }
  return widths;
}

export function flagAssertList(flags: Record<string, string | boolean>): string[] {
  const raw = flagString(flags, 'assert');
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
