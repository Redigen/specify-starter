import type { TokensThemes } from "../types/tokens.ts";

export function getTokenValue(
  tokens: TokensThemes,
  theme: string,
  path: string,
): unknown {
  const parts = path.split(".");
  let current: unknown = tokens.themes[theme];

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}
